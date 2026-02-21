#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '4173'))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434')
ROOT = Path(__file__).resolve().parent


def ollama_chat(messages, model):
    payload = json.dumps({'model': model, 'stream': False, 'messages': messages}).encode('utf-8')
    req = urllib.request.Request(
        f'{OLLAMA_URL}/api/chat',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        body = json.loads(response.read().decode('utf-8'))
        return body.get('message', {}).get('content', '')


def ollama_health():
    req = urllib.request.Request(f'{OLLAMA_URL}/api/tags', method='GET')
    with urllib.request.urlopen(req, timeout=5) as response:
        body = json.loads(response.read().decode('utf-8'))
        models = [item.get('name', '') for item in body.get('models', [])]
        return {'ok': True, 'models': models}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _json(self, status, payload):
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/api/health':
            try:
                self._json(200, ollama_health())
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'models': [], 'error': str(err)})
            return

        if self.path == '/api/runtime':
            self._json(200, {'ok': True, 'host': HOST, 'port': PORT, 'ollamaUrl': OLLAMA_URL})
            return

        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/chat':
            self._json(404, {'ok': False, 'error': 'Not found'})
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
            messages = payload.get('messages', [])
            model = payload.get('model', 'llama3.1:8b')
            reply = ollama_chat(messages, model)
            self._json(200, {'ok': True, 'reply': reply})
        except urllib.error.URLError as err:
            self._json(200, {'ok': False, 'error': f'Ollama unavailable: {err}'})
        except Exception as err:  # noqa: BLE001
            self._json(500, {'ok': False, 'error': str(err)})


if __name__ == '__main__':
    print(f'OpenBoBS server running at http://{HOST}:{PORT}')
    print(f'Ollama endpoint: {OLLAMA_URL}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
