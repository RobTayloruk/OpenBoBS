#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '4173'))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434')


def ollama_chat(messages, model):
    payload = json.dumps({
        'model': model,
        'stream': False,
        'messages': messages,
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{OLLAMA_URL}/api/chat',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        body = json.loads(response.read().decode('utf-8'))
        message = body.get('message', {})
        return message.get('content', '')


def ollama_health():
    req = urllib.request.Request(f'{OLLAMA_URL}/api/tags', method='GET')
    with urllib.request.urlopen(req, timeout=4) as response:
        body = json.loads(response.read().decode('utf-8'))
        models = [m.get('name', '') for m in body.get('models', [])]
        return {'ok': True, 'models': models}


class Handler(SimpleHTTPRequestHandler):
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
                self._json(200, {'ok': False, 'error': str(err), 'models': []})
            return
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/chat':
            self._json(404, {'error': 'Not found'})
            return

        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length)

        try:
            payload = json.loads(raw.decode('utf-8'))
            messages = payload.get('messages', [])
            model = payload.get('model', 'llama3.1:8b')
            reply = ollama_chat(messages, model)
            self._json(200, {'ok': True, 'reply': reply})
        except urllib.error.URLError as err:
            self._json(200, {'ok': False, 'error': f'Ollama unavailable: {err}'})
        except Exception as err:  # noqa: BLE001
            self._json(500, {'ok': False, 'error': str(err)})


if __name__ == '__main__':
    print(f'OpenBoBS server starting on http://{HOST}:{PORT}')
    print(f'Offline Ollama endpoint: {OLLAMA_URL}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
