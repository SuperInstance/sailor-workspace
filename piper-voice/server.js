#!/usr/bin/env node

/**
 * piper-voice — Piper TTS Voice Output Agent
 *
 * HTTP server on port 8770 that accepts POST /speak with text content and
 * voice_quality features, synthesizes speech via Piper TTS (with SSML prosody),
 * and returns WAV audio.
 *
 * Voice Quality → SSML mapping:
 *   urgency   → <prosody rate="...">
 *   stability → <prosody pitch="...">
 *   brightness→ <prosody volume="...">
 *
 * Endpoints:
 *   GET  /health          — Health check
 *   GET  /agent           — Probe (identity + status)
 *   POST /agent           — Probe (same as GET)
 *   POST /speak           — Synthesize speech from text + voice_quality
 *   POST /speak-ssml      — Synthesize raw SSML (passthrough)
 *
 * Pipeline integration:
 *   fleet-conductor (:8769) → HTTP POST → piper-voice (:8770)
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────
const PORT        = parseInt(process.env.PIPER_VOICE_PORT || '8770', 10);
const HOST        = process.env.PIPER_VOICE_HOST  || '0.0.0.0';
const MODEL_DIR   = process.env.PIPER_MODEL_DIR   ||
  path.join(process.env.HOME || '/home/ubuntu', '.local', 'share', 'piper', 'voices');
const PIPER_CLI   = process.env.PIPER_CLI_PATH    ||
  path.join(process.env.HOME || '/home/ubuntu', '.local', 'bin', 'piper');
const CACHE_DIR   = path.join(__dirname, 'cache');
const MAX_TEXT_LEN = 5000; // max input text chars

// Use system python3 for piper (avoids brew python 3.14 numpy issue)
const PYTHON      = '/usr/bin/python3';

// ─── Voice model discovery ────────────────────────────────────────────
function findVoiceModels() {
  const models = [];
  try {
    if (fs.existsSync(MODEL_DIR)) {
      const files = fs.readdirSync(MODEL_DIR);
      for (const f of files) {
        if (f.endsWith('.onnx')) {
          const base = path.join(MODEL_DIR, f.replace(/\.onnx$/, ''));
          const modelPath = path.join(MODEL_DIR, f);
          const configPath = modelPath + '.json';
          models.push({
            name: f.replace(/\.onnx$/, ''),
            model: modelPath,
            config: fs.existsSync(configPath) ? configPath : null,
          });
        }
      }
    }
  } catch (e) {
    console.error(`[piper-voice] Error scanning models: ${e.message}`);
  }
  return models;
}

const VOICE_MODELS = findVoiceModels();
const DEFAULT_MODEL = VOICE_MODELS[0] || null;

// ─── SSML Generator ───────────────────────────────────────────────────
// Map voice_quality dict to SSML prosody tags
function buildSsml(text, voiceQuality = {}) {
  const rate     = voiceQuality.urgency   ? 'fast'   : 'medium';
  const pitch    = voiceQuality.stability  ? '+50%'   : '0%';
  const volume   = voiceQuality.brightness ? 'loud'   : 'medium';

  // Escape XML special chars in text
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis">
  <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
    ${escaped}
  </prosody>
</speak>`;
}

// ─── Piper TTS Synthesis ──────────────────────────────────────────────
function synthesize(ssml, modelPath = null) {
  return new Promise((resolve, reject) => {
    const model = modelPath || (DEFAULT_MODEL ? DEFAULT_MODEL.model : null);
    if (!model) {
      return reject(new Error('NO_VOICE_MODEL'));
    }

    // Use --data-dir so piper finds the model and config
    const args = [
      PIPER_CLI,
      '--model', model,
      '--ssml',
      '--output-raw',
      '--data-dir', MODEL_DIR,
    ];

    const startTime = Date.now();
    const piper = spawn(PYTHON, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: '' },
    });

    const chunks = [];
    let errorBuf = '';

    piper.stdout.on('data', (chunk) => chunks.push(chunk));

    piper.stderr.on('data', (chunk) => {
      errorBuf += chunk.toString();
    });

    piper.on('close', (code) => {
      const elapsed = Date.now() - startTime;
      if (code !== 0 || chunks.length === 0) {
        return reject(new Error(`Piper exit ${code}: ${errorBuf.slice(0, 500)}`));
      }
      const rawPcm = Buffer.concat(chunks);
      resolve({
        pcm: rawPcm,
        sampleRate: 22050,
        bitDepth: 16,
        channels: 1,
        durationMs: Math.round((rawPcm.length / 2 / 22050) * 1000),
        elapsedMs: elapsed,
      });
    });

    piper.on('error', (err) => {
      reject(new Error(`Piper spawn error: ${err.message}`));
    });

    // Feed SSML and close stdin
    piper.stdin.write(ssml);
    piper.stdin.end();
  });
}

// ─── WAV Header Builder ───────────────────────────────────────────────
function buildWav(pcm, sampleRate) {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);  // file size - 8
  header.write('WAVE', 8);
  
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);            // chunk size
  header.writeUInt16LE(1, 20);             // PCM format
  header.writeUInt16LE(1, 22);             // mono
  header.writeUInt32LE(sampleRate, 24);    // sample rate
  header.writeUInt32LE(sampleRate * 2, 28);// byte rate
  header.writeUInt16LE(2, 32);             // block align
  header.writeUInt16LE(16, 34);            // bits per sample
  
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  
  return Buffer.concat([header, pcm]);
}

// ─── HTTP Server ──────────────────────────────────────────────────────
function createServer() {
  // Ensure cache dir exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  return http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // ── Collect body for POST requests ──────────────────────────────
    function collectBody() {
      return new Promise((resolve) => {
        if (req.method !== 'POST') return resolve(null);
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve(null);
          }
        });
      });
    }

    // ── Route handlers ──────────────────────────────────────────────
    async function handle() {
      // GET /health
      if ((pathname === '/health') && (req.method === 'GET')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'piper-voice',
          version: '1.0.0',
          uptime_ms: process.uptime() * 1000,
          voicesAvailable: VOICE_MODELS.length,
          defaultVoice: DEFAULT_MODEL ? DEFAULT_MODEL.name : null,
          ssmlSupported: true,
        }));
        return;
      }

      // GET /agent or POST /agent — probe/identity
      if (pathname === '/agent') {
        const body = req.method === 'POST' ? await collectBody() : {};
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          agentId: 'piper',
          name: 'piper-voice',
          port: PORT,
          description: 'Piper TTS voice output — SSML prosody control',
          voices: VOICE_MODELS.map((v) => v.name),
          defaultVoice: DEFAULT_MODEL ? DEFAULT_MODEL.name : null,
          ssmlQualityMap: {
            urgency: 'prosody rate',
            stability: 'prosody pitch',
            brightness: 'prosody volume',
          },
          ...(body.source ? { source: body.source } : {}),
        }));
        return;
      }

      // POST /speak — synthesize speech from text + voice_quality
      if ((pathname === '/speak') && (req.method === 'POST')) {
        const body = await collectBody();
        if (!body || !body.text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MISSING_TEXT', message: 'Please provide "text" in the request body' }));
          return;
        }

        if (body.text.length > MAX_TEXT_LEN) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'TEXT_TOO_LONG', message: `Maximum text length is ${MAX_TEXT_LEN} characters` }));
          return;
        }

        if (!DEFAULT_MODEL) {
          // No voice model — return mock response
          const ssml = buildSsml(body.text, body.voice_quality || {});
          console.log(`[piper-voice] ⚠ No voice model — would speak:`);
          console.log(`[piper-voice]   Text: ${body.text.slice(0, 200)}${body.text.length > 200 ? '...' : ''}`);
          console.log(`[piper-voice]   SSML: ${ssml.slice(0, 300)}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            mock: true,
            text: body.text,
            ssml,
            note: 'No voice model loaded — this is a simulated response',
            quality: body.voice_quality || {},
          }));
          return;
        }

        try {
          const ssml = buildSsml(body.text, body.voice_quality || {});
          console.log(`[piper-voice] Synthesizing ${body.text.length} chars...`);
          console.log(`[piper-voice]   Quality: ${JSON.stringify(body.voice_quality || {})}`);

          const result = await synthesize(ssml, body.model || null);
          const wav = buildWav(result.pcm, result.sampleRate);

          res.writeHead(200, {
            'Content-Type': 'audio/wav',
            'Content-Length': wav.length.toString(),
            'X-Duration-Ms': result.durationMs.toString(),
            'X-Synthesis-Ms': result.elapsedMs.toString(),
            'X-Voice': DEFAULT_MODEL.name,
          });
          res.end(wav);
          console.log(`[piper-voice] ✓ Synthesized ${result.durationMs}ms audio in ${result.elapsedMs}ms`);
        } catch (err) {
          console.error(`[piper-voice] ✗ Synthesis failed: ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'SYNTHESIS_ERROR',
            message: err.message,
          }));
        }
        return;
      }

      // POST /speak-ssml — synthesize raw SSML (passthrough)
      if ((pathname === '/speak-ssml') && (req.method === 'POST')) {
        const body = await collectBody();
        if (!body || !body.ssml) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MISSING_SSML', message: 'Please provide "ssml" in the request body' }));
          return;
        }

        if (!DEFAULT_MODEL) {
          console.log(`[piper-voice] ⚠ No voice model — would speak SSML:`);
          console.log(`[piper-voice]   SSML: ${body.ssml.slice(0, 300)}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            mock: true,
            ssml: body.ssml,
            note: 'No voice model loaded — this is a simulated response',
          }));
          return;
        }

        try {
          const result = await synthesize(body.ssml, body.model || null);
          const wav = buildWav(result.pcm, result.sampleRate);

          res.writeHead(200, {
            'Content-Type': 'audio/wav',
            'Content-Length': wav.length.toString(),
            'X-Duration-Ms': result.durationMs.toString(),
            'X-Synthesis-Ms': result.elapsedMs.toString(),
          });
          res.end(wav);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'SYNTHESIS_ERROR', message: err.message }));
        }
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'NOT_FOUND',
        message: `Path ${pathname} not found. Available: /health, /agent, /speak, /speak-ssml`,
      }));
    }

    handle().catch((err) => {
      console.error(`[piper-voice] Unhandled error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
      }
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────
function main() {
  const server = createServer();

  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     Piper Voice — TTS Output Agent               ║');
    console.log('║     v1.0.0                                      ║');
    console.log('║     ' + new Date().toISOString() + '            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  HTTP    : http://${HOST}:${PORT}                       ║`);
    console.log(`║  Endpoints: /health /agent /speak /speak-ssml   ║`);
    console.log(`║  Piper CLI: ${PIPER_CLI}   ║`);
    console.log(`║  Model Dir: ${MODEL_DIR}   ║`);
    console.log(`║  Models  : ${VOICE_MODELS.length} loaded                     ║`);
    if (DEFAULT_MODEL) {
      console.log(`║  Default : ${DEFAULT_MODEL.name}               ║`);
    } else {
      console.log(`║  ⚠ No voice models — running in mock mode     ║`);
    }
    console.log(`║  SSML    : supported                          ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // ── Graceful shutdown ────────────────────────────────────────────
  function shutdown(signal) {
    console.log(`\n⏹  ${signal}: Shutting down...`);
    server.close(() => {
      console.log('⏹  Piper Voice stopped.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⏹  Force exit after timeout');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ─── Run ───────────────────────────────────────────────────────────────
main();
