#!/usr/bin/env python3
"""
fleet-agent — Universal fleet-midi agent server.

Usage:
  python3 fleet-agent.py --port PORT --agent AGENT_NAME

Agent names: chord, scale, voicing, tempo, cc, expression, dynamics,
             pan, modulation, arp, groove, velocity, fx, register, melody, bass

Each responds to GET /health, GET /agent, POST /agent (probe→{status:'ok'}),
and POST /agent with cue data → per-agent analysis + ternary_vector.
"""

import json, http.server, sys, argparse, math, random

# ─── Agent Behavioral Functions ───────────────────────────────────────

def _notes(raw):
    """Extract note list from raw request data (handles wrapper nesting)."""
    voice = raw.get('voice', raw.get('payload', {}))
    notes = raw.get('notes', raw.get('note',
                voice.get('notes', voice.get('note', []))))
    if isinstance(notes, int): notes = [notes]
    return notes if isinstance(notes, list) else []

def _val(payload, *keys, default=0):
    """Extract a value from payload/voice by any key name."""
    voice = payload.get('voice', {})
    for k in keys:
        v = payload.get(k)
        if v is not None: return v
        v = voice.get(k)
        if v is not None: return v
    return default

class AgentBehaviors:
    """Static methods for each agent's cue analysis."""

    @staticmethod
    def chord(notes, payload):
        """note_roots → major/minor, ternary=[+1|0|-1, 0, 0]"""
        if not notes:
            return {'result':'rest','ternary_vector':[0,0,0]}
        root = min(notes) % 12
        intervals = sorted([n % 12 for n in notes])
        has_major3 = 4 in [(i-root)%12 for i in intervals]
        has_minor3 = 3 in [(i-root)%12 for i in intervals]
        tern = [0,0,0]
        ctype = 'power'
        if has_major3:
            tern[0] = 1; ctype = 'major'
        elif has_minor3:
            tern[0] = -1; ctype = 'minor'
        return {'root':root,'type':ctype,'ternary_vector':tern}

    @staticmethod
    def scale(notes, payload):
        """note_range → mode detection, ternary=[0, +1, 0] for direction"""
        if not notes:
            return {'result':'rest','ternary_vector':[0,0,0]}
        mn, mx = min(notes), max(notes)
        direction = 1 if len(notes) > 1 and notes[-1] > notes[0] else (-1 if len(notes) > 1 and notes[-1] < notes[0] else 0)
        spread = mx - mn
        if spread <= 12:
            mode = 'pentatonic' if len(set(n%12 for n in notes)) <= 5 else 'diatonic'
        elif spread <= 24:
            mode = 'extended'
        else:
            mode = 'chromatic'
        return {'range':[mn,mx],'spread':spread,'direction':direction,
                'ternary_vector':[0,1 if direction>0 else (-1 if direction<0 else 0),0],
                'mode_guess':mode}

    @staticmethod
    def voicing(notes, payload):
        """note_set → church mode brightness, ternary by brightness"""
        if not notes:
            return {'result':'rest','ternary_vector':[0,0,0]}
        root = min(notes) % 12
        intervals = sorted([n % 12 for n in notes])
        unique_intervals = [(i-root)%12 for i in intervals if (i-root)%12 in range(12)]
        # Brightness heuristic: more major intervals = brighter
        brightness = sum(1 for iv in unique_intervals if iv in (0,4,7,11))
        tern = [0,0,0]
        if brightness >= 3: tern[0] = 1  # bright (lydian/major)
        elif brightness >= 2: tern[0] = 0  # neutral (mixolydian/dorian)
        else: tern[0] = -1  # dark (aeolian/phrygian/locrian)
        return {'brightness':brightness,'ternary_vector':tern}

    @staticmethod
    def tempo(notes, payload):
        """BPM input → time_feel, ternary by tempo range"""
        bpm = _val(payload, 'bpm', 'tempo', default=120)
        if bpm >= 140: feel = 'fast'; tern = [1,0,0]
        elif bpm >= 100: feel = 'moderate'; tern = [0,1,0]
        else: feel = 'slow'; tern = [-1,0,0]
        return {'bpm':bpm,'feel':feel,'ternary_vector':tern}

    @staticmethod
    def cc(notes, payload):
        """CC values → smoothed output, ternary by change_direction"""
        cc_val = _val(payload, 'cc', 'ccs', default=64)
        delta = _val(payload, 'delta', default=0)
        tern = [0,0,0]
        if delta > 5: tern[0] = 1
        elif delta < -5: tern[0] = -1
        tern[1] = 1 if cc_val > 64 else (-1 if cc_val < 64 else 0)
        return {'cc':cc_val,'delta':delta,'ternary_vector':tern}

    @staticmethod
    def expression(notes, payload):
        """CC → articulation, ternary by intensity"""
        expr = _val(payload, 'expression', 'cc', default=64)
        intensity = expr / 127.0
        tern = [0,0,0]
        if intensity > 0.7: tern[0] = 1; art = 'accented'
        elif intensity < 0.3: tern[0] = -1; art = 'ghost'
        else: art = 'neutral'
        return {'expression':expr,'intensity':round(intensity,2),'articulation':art,'ternary_vector':tern}

    @staticmethod
    def dynamics(notes, payload):
        """velocity_range → crescendo/diminuendo, ternary by direction"""
        vel = _val(payload, 'velocity', default=64)
        if isinstance(notes, list) and len(notes) > 1:
            vel_range = [v for v in notes if isinstance(v,int) and 0<=v<=127]
            direction = 1 if len(vel_range) > 1 and vel_range[-1] > vel_range[0] else (-1 if len(vel_range) > 1 and vel_range[-1] < vel_range[0] else 0)
        else:
            direction = 0
        tern = [0,0,0]
        if direction > 0: tern[0] = 1; dyn = 'crescendo'
        elif direction < 0: tern[0] = -1; dyn = 'diminuendo'
        else: dyn = 'static' if vel > 96 else 'mezzo' if vel > 48 else 'piano'
        return {'velocity':vel,'direction':direction,'dynamic':dyn,'ternary_vector':tern}

    @staticmethod
    def pan(notes, payload):
        """spatial_data → pan_position, ternary by L/R"""
        pan_val = _val(payload, 'pan', 'azimuth', 'spatial', default=64)
        tern = [0,0,0]
        if pan_val > 64: tern[0] = 1; side = 'right'
        elif pan_val < 64: tern[0] = -1; side = 'left'
        else: side = 'center'
        return {'pan':pan_val,'side':side,'ternary_vector':tern}

    @staticmethod
    def modulation(notes, payload):
        """LFO_rate/modulation, ternary by speed"""
        mod = _val(payload, 'modulation', 'mod', default=0)
        rate = _val(payload, 'rate', 'lfo_rate', default=2.0)
        tern = [0,0,0]
        if rate >= 5: tern[0] = 1; feel = 'fast'
        elif rate >= 2: tern[0] = 0; feel = 'medium'
        else: tern[0] = -1; feel = 'slow'
        return {'modulation':mod,'rate':rate,'feel':feel,'ternary_vector':tern}

    @staticmethod
    def arp(notes, payload):
        """note_pattern → arpeggiation, ternary by direction"""
        if not notes or len(notes) < 2:
            return {'result':'no_pattern','ternary_vector':[0,0,0]}
        first_group = notes[:min(8,len(notes))]
        sorted_up = sorted(first_group)
        sorted_down = sorted(first_group, reverse=True)
        if list(first_group) == sorted_up:
            direction = 'up'; tern = [1,0,0]
        elif list(first_group) == sorted_down:
            direction = 'down'; tern = [-1,0,0]
        else:
            direction = 'random/mixed'; tern = [0,1,0]
        return {'notes':first_group,'direction':direction,
                'ternary_vector':tern}

    @staticmethod
    def groove(notes, payload):
        """timing_offset → swing, ternary by feel"""
        swing = _val(payload, 'swing', 'groove', default=0)
        tern = [0,0,0]
        if swing > 30: tern[0] = 1; feel = 'heavy_swing'
        elif swing > 10: tern[0] = 0; feel = 'light_swing'
        elif swing < -10: tern[0] = -1; feel = 'ahead'
        else: feel = 'straight'
        return {'swing':swing,'feel':feel,'ternary_vector':tern}

    @staticmethod
    def velocity(notes, payload):
        """velocity_curve → humanization, ternary by accent"""
        vel = _val(payload, 'velocity', default=64)
        accent = _val(payload, 'accent', default=0)
        tern = [0,0,0]
        if accent > 10: tern[0] = 1; curve = 'accented'
        elif accent < -10: tern[0] = -1; curve = 'soft'
        else:
            if vel > 96: curve = 'loud'
            elif vel > 48: curve = 'medium'
            else: curve = 'soft'
        return {'velocity':vel,'accent':accent,'curve':curve,'ternary_vector':tern}

    @staticmethod
    def fx(notes, payload):
        """effect_type → reverb/delay, ternary by wet/dry"""
        fx_type = _val(payload, 'fx', 'effect', default='reverb')
        wet = _val(payload, 'wet', 'mix', default=50)
        tern = [0,0,0]
        if wet > 60: tern[0] = 1; amt = 'wet'
        elif wet < 40: tern[0] = -1; amt = 'dry'
        else: amt = 'balanced'
        return {'fx':fx_type,'wet':wet,'amount':amt,'ternary_vector':tern}

    @staticmethod
    def register(notes, payload):
        """octave_range → brightness, ternary by register"""
        if not notes:
            return {'result':'rest','ternary_vector':[0,0,0]}
        avg = sum(notes)/len(notes)
        mn, mx = min(notes), max(notes)
        tern = [0,0,0]
        if avg > 84: tern[0] = 1; reg = 'high'; bright = 'bright'
        elif avg > 60: tern[0] = 0; reg = 'mid'; bright = 'neutral'
        else: tern[0] = -1; reg = 'low'; bright = 'dark'
        return {'avg_note':round(avg,1),'register':reg,'brightness':bright,
                'range_note72':[mn,mx],'ternary_vector':tern}

    @staticmethod
    def melody(notes, payload):
        """note_sequence → contour, ternary by direction"""
        if not notes or len(notes) < 2:
            return {'result':'single_note','ternary_vector':[0,0,0]}
        # Simple contour: first note vs last note
        first, last = notes[0], notes[-1]
        rise = last - first
        tern = [0,0,0]
        if rise > 3: contour = 'ascending'; tern[0] = 1
        elif rise < -3: contour = 'descending'; tern[0] = -1
        else: contour = 'static/arcing'; tern[1] = 1
        return {'first_note':first,'last_note':last,'rise':rise,
                'contour':contour,'ternary_vector':tern}

    @staticmethod
    def bass(notes, payload):
        """root_notes → bass_line, ternary by step"""
        if not notes:
            return {'result':'rest','ternary_vector':[0,0,0]}
        root_note = min(notes)
        # Detect step pattern in bass-appropriate register (notes 24-60)
        bass_notes = [n for n in notes if 24 <= n <= 72]
        if not bass_notes:
            bass_notes = notes
        tern = [0,0,0]
        if len(bass_notes) >= 2:
            step = bass_notes[-1] - bass_notes[0]
            if step > 5: tern[0] = 1; pattern = 'leaping'
            elif step > 0: tern[0] = 0; pattern = 'walking'
            elif step < -5: tern[0] = -1; pattern = 'dropping'
            else: pattern = 'pedal'
        else:
            pattern = 'root_pedal'
        return {'root':root_note,'bass_notes':bass_notes,'pattern':pattern,
                'ternary_vector':tern}

# ─── Agent Registry ──────────────────────────────────────────────────

AGENT_HANDLERS = {
    'chord': AgentBehaviors.chord,
    'scale': AgentBehaviors.scale,
    'voicing': AgentBehaviors.voicing,
    'tempo': AgentBehaviors.tempo,
    'cc': AgentBehaviors.cc,
    'expression': AgentBehaviors.expression,
    'dynamics': AgentBehaviors.dynamics,
    'pan': AgentBehaviors.pan,
    'modulation': AgentBehaviors.modulation,
    'arp': AgentBehaviors.arp,
    'groove': AgentBehaviors.groove,
    'velocity': AgentBehaviors.velocity,
    'fx': AgentBehaviors.fx,
    'register': AgentBehaviors.register,
    'melody': AgentBehaviors.melody,
    'bass': AgentBehaviors.bass,
}

# ─── HTTP Handler ──────────────────────────────────────────────────────

class FleetAgentHandler(http.server.BaseHTTPRequestHandler):
    agent_name = 'unknown'
    handler_fn = None

    def _json(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        if self.path in ('/','/health','/agent'):
            self._json(200, {
                'status':'ok',
                'agent':f'fleet-midi-{self.agent_name}',
            })
        else:
            self._json(404, {'error':'NOT_FOUND'})

    def do_POST(self):
        length = int(self.headers.get('Content-Length',0))
        body = self.rfile.read(length) if length else b'{}'
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._json(400, {'error':'INVALID_JSON'})
            return

        # Handle probe from conductor health check
        if data.get('type') == 'probe':
            self._json(200, {'status':'ok'})
            return

        # Extract cue payload
        payload = data.get('voice', data.get('payload', data))
        notes = _notes(data)

        # Run agent handler (access via class to avoid bound-method descriptor)
        try:
            result = type(self).handler_fn(notes, payload)
        except Exception as e:
            result = {'error':str(e),'ternary_vector':[0,0,0]}

        self._json(200, {
            'status':'ok',
            'agent':f'fleet-midi-{self.agent_name}',
            'output': result.get('result', None),
            **result,
        })

    def log_message(self, fmt, *args):
        msg = fmt % args
        if 'probe' in msg or 'health' in msg:
            return
        print(f"  [{self.agent_name}] {self.command} {self.path}")

def create_server(agent_name, port):
    handler = type('Handler', (FleetAgentHandler,), {
        'agent_name': agent_name,
        'handler_fn': AGENT_HANDLERS.get(agent_name, lambda n,p: {'error':'UNKNOWN_AGENT'}),
    })
    return http.server.HTTPServer(('0.0.0.0', port), handler)

def main():
    parser = argparse.ArgumentParser(description='Fleet-MIDI Agent Server')
    parser.add_argument('--port', type=int, required=True, help='Port to listen on')
    parser.add_argument('--agent', type=str, required=True,
                        choices=list(AGENT_HANDLERS.keys()),
                        help='Agent behavior type')
    args = parser.parse_args()

    if args.agent not in AGENT_HANDLERS:
        print(f"ERROR: Unknown agent '{args.agent}'. Choices: {','.join(AGENT_HANDLERS.keys())}")
        sys.exit(1)

    server = create_server(args.agent, args.port)
    print(f"fleet-midi-{args.agent} agent on :{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  [{args.agent}] Shutting down")
        server.server_close()

if __name__ == '__main__':
    main()
