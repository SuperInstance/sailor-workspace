#!/usr/bin/env python3
"""Simple HTTP server for prototypes with CORS."""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()

print(f"Serving {DIR} on port {PORT}...")
print(f"Prosody Bridge: http://localhost:{PORT}/prosody-bridge.html")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
