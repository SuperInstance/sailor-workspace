/*
Telescope Console — Frontend JavaScript

Real-time pipeline updates, WebSocket communication,
interaction handling, and visualization.
*/

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
const logOutput = document.getElementById('logOutput');
let ws = null;
let connected = false;
let pendingActions = [];

function whenConnected(action) {
    if (connected && ws && ws.readyState === WebSocket.OPEN) {
        action();
    } else {
        pendingActions.push(action);
        if (!connected) log('Queued action — waiting for connection...', 'info');
    }
}

function log(message, type = 'info') {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    let prefix = '';
    
    switch(type) {
        case 'success': prefix = '✅ '; break;
        case 'error': prefix = '❌ '; break;
        case 'warning': prefix = '⚠️ '; break;
        default: prefix = '🔹 ';
    }
    
    logOutput.innerHTML += `${time} ${prefix}${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

function updateStatus(data) {
    const bridgeStatus = document.getElementById('bridgeStatus');
    const frameCount = document.getElementById('frameCount');
    const clientCount = document.getElementById('clientCount');
    
    if (data.bridge?.connected) {
        bridgeStatus.textContent = 'Online';
        bridgeStatus.classList.remove('offline');
        bridgeStatus.classList.add('online');
    } else {
        bridgeStatus.textContent = 'Offline';
        bridgeStatus.classList.remove('online');
        bridgeStatus.classList.add('offline');
    }
    
    frameCount.textContent = data.bridge?.frames_received || 0;
    clientCount.textContent = data.ws_clients ?? 0;
}

function updateFeatureVisualization(features) {
    if (!features) return;
    
    const loudness = features.loudness || 0;
    const loudnessPct = Math.min(100, (loudness / 2.0) * 100);
    document.getElementById('loudnessVal').textContent = loudness.toFixed(2);
    document.getElementById('loudnessMeter').style.width = `${loudnessPct}%`;
    
    const f0 = features.f0_raw || 0;
    const f0Pct = Math.min(100, (f0 / 2000) * 100);
    document.getElementById('f0Val').textContent = f0.toFixed(1);
    document.getElementById('f0Meter').style.width = `${f0Pct}%`;
    
    const spec = features.spectral_centroid || 0;
    const specPct = Math.min(100, (spec / 2000) * 100);
    document.getElementById('spectVal').textContent = spec.toFixed(1);
    document.getElementById('spectMeter').style.width = `${specPct}%`;
    
    const midiCc = features.midi_cc || {};
    const cc7 = midiCc['7'] || 0;
    const cc7Pct = cc7;
    document.getElementById('cc7Val').textContent = `${cc7}`;
    document.getElementById('cc7Meter').style.width = `${cc7Pct}%`;
    
    log(`Received ${Object.keys(features).length} features`, 'debug');
}

function connectWebSocket() {
    ws = new WebSocket(wsUrl);
    
    ws.addEventListener('open', () => {
        connected = true;
        log('Connected to telescope backend', 'success');
        // Flush pending actions
        const queue = pendingActions.slice();
        pendingActions = [];
        queue.forEach(fn => { try { fn(); } catch(e) { log(`Pending action failed: ${e.message}`, 'error'); } });
    });
    
    ws.addEventListener('close', () => {
        connected = false;
        log('Disconnected from telescope backend', 'warning');
        setTimeout(connectWebSocket, 3000);
    });
    
    ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'init':
                updateStatus(data);
                log('Initial pipeline state loaded', 'success');
                break;
            case 'pipeline_reset':
                log('Pipeline reset', 'warning');
                updateStatus(data);
                break;
            case 'pipeline_start':
                log('Pipeline started', 'success');
                updateStatus(data);
                break;
            case 'features':
                updateFeatureVisualization(data.data);
                break;
            case 'bridge_connected':
                bridgeStatus.textContent = 'Online';
                bridgeStatus.classList.remove('offline');
                bridgeStatus.classList.add('online');
                log('Bridge connected', 'success');
                break;
        }
    });
    
    ws.addEventListener('error', (error) => {
        log(`WebSocket error: ${error.message}`, 'error');
        ws.close();
    });
}

// Drag & Drop File Handling
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
    }
});

browseBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFileUpload(fileInput.files[0]);
    }
});

function handleFileUpload(file) {
    log(`Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const audioData = e.target.result;
        
        // Decode audio via Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioCtx.decodeAudioData(audioData);
            const channelData = audioBuffer.getChannelData(0);
            log(`Audio decoded: ${audioBuffer.duration.toFixed(1)}s at ${audioBuffer.sampleRate}Hz`, 'success');
            
            // Send to backend for processing
            await fetch('/api/pipeline/run', { method: 'POST' });
            
            whenConnected(() => {
                const header = JSON.stringify({
                    type: 'audio',
                    sampleRate: audioBuffer.sampleRate,
                    length: channelData.length
                }) + '\n';
                const encoder = new TextEncoder();
                const headerBytes = encoder.encode(header);
                const audioBytes = new Float32Array(channelData).buffer;
                const combined = new Uint8Array(headerBytes.byteLength + audioBytes.byteLength);
                combined.set(headerBytes, 0);
                combined.set(new Uint8Array(audioBytes), headerBytes.byteLength);
                ws.send(combined.buffer);
                log('Audio sent to bridge for processing', 'success');
            });
        } catch (err) {
            log(`Failed to decode audio: ${err.message}`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);

    function sendAudioToBridge(sampleRate, audioData) {
        const header = JSON.stringify({ type: 'audio', sampleRate, length: audioData.length }) + '\n';
        const encoder = new TextEncoder();
        const headerBytes = encoder.encode(header);
        const float32 = new Float32Array(audioData);
        const combined = new Uint8Array(headerBytes.byteLength + float32.byteLength);
        combined.set(headerBytes, 0);
        combined.set(new Uint8Array(float32.buffer), headerBytes.byteLength);
        ws.send(combined.buffer);
    }
}

// Quick Actions
const testBtn = document.getElementById('testBtn');
testBtn.addEventListener('click', () => {
    log('Generating test 440Hz sine wave audio...', 'info');
    
    const sampleRate = 16000;
    const duration = 3;
    const t = new Array(sampleRate * duration).fill(0).map((_, i) => i / sampleRate);
    const audio = t.map(time => Math.sin(2 * Math.PI * 440 * time) * 0.3);
    
    whenConnected(() => {
        const chunkSize = 1024;
        let offset = 0;
        const sendChunk = () => {
            if (offset >= audio.length) {
                log('Test audio streaming complete', 'success');
                return;
            }
            const chunk = audio.slice(offset, offset + chunkSize);
            const header = JSON.stringify({ type: 'audio', chunk: true, sampleRate }) + '\n';
            const encoder = new TextEncoder();
            const headerBytes = encoder.encode(header);
            const chunkFloat32 = new Float32Array(chunk);
            const combined = new Uint8Array(headerBytes.byteLength + chunkFloat32.byteLength);
            combined.set(headerBytes, 0);
            combined.set(new Uint8Array(chunkFloat32.buffer), headerBytes.byteLength);
            ws.send(combined.buffer);
            offset += chunkSize;
            setTimeout(sendChunk, 10);
        };
        sendChunk();
        log('Test audio streaming to bridge...', 'success');
    });
});

// Pipeline Controls — use REST API
const resetBtn = document.getElementById('resetBtn');
const runBtn = document.getElementById('runBtn');

resetBtn.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/pipeline/reset', { method: 'POST' });
        if (res.ok) log('Pipeline reset via REST', 'warning');
    } catch (err) {
        log(`Reset failed: ${err.message}`, 'error');
    }
});

runBtn.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/pipeline/run', { method: 'POST' });
        if (res.ok) log('Full pipeline started — one-click transcribe mode', 'success');
    } catch (err) {
        log(`Run failed: ${err.message}`, 'error');
    }
});

// Pipeline stage buttons
document.querySelectorAll('.pipeline-controls .btn').forEach((btn, i) => {
    const stages = ['audio_in', 'source_sep', 'feature_extract', 'persona_profile', 'midi_output'];
    btn.addEventListener('click', () => {
        const stage = stages[i] || `stage_${i}`;
        log(`Selected stage: ${stage}`, 'info');
    });
});

// Initialize
window.addEventListener('load', () => {
    connectWebSocket();
    log('Telescope Console loaded successfully', 'success');
});

window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
});
