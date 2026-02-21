#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '4173'))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434')
ROOT = Path(__file__).resolve().parent
AGENT_LIBRARY_DIR = ROOT / 'agent_library'
AGENT_LIBRARY_DIR.mkdir(exist_ok=True)
STARTED_AT = time.time()

METRICS = {
    'chatRequests': 0,
    'searchRequests': 0,
    'agentImports': 0,
    'agentSaves': 0,
    'agentLibraryReads': 0,
    'ollamaStatusChecks': 0,
    'healthChecks': 0,
    'runtimeChecks': 0,
}


def ollama_chat(messages, model):
    payload = json.dumps({'model': model, 'stream': False, 'messages': messages}).encode('utf-8')
    req = urllib.request.Request(
        f'{OLLAMA_URL}/api/chat', data=payload, headers={'Content-Type': 'application/json'}, method='POST'
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


def web_search(query):
    url = f'https://duckduckgo.com/html/?q={urllib.parse.quote(query)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
    matches = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html)
    return {
        'ok': True,
        'results': [{'title': re.sub(r'<[^>]+>', '', title).strip(), 'url': link} for link, title in matches[:6]],
    }


def sanitize_filename(name):
    clean = re.sub(r'[^a-zA-Z0-9._-]+', '-', name).strip('-')
    return clean or f'agent-{int(time.time())}'


def list_agent_library():
    items = []
    for file in sorted(AGENT_LIBRARY_DIR.glob('*.json')):
        try:
            data = json.loads(file.read_text(encoding='utf-8'))
        except Exception:  # noqa: BLE001
            data = {}
        items.append(
            {
                'file': file.name,
                'name': data.get('name') or file.stem,
                'source': data.get('_source', 'local'),
                'size': file.stat().st_size,
                'downloadUrl': f'/agent_library/{file.name}',
                'content': data,
            }
        )
    return {'ok': True, 'items': items}


def save_agent(payload, source='local-edit'):
    if not isinstance(payload, dict):
        raise ValueError('Agent payload must be a JSON object')
    name = payload.get('name') or payload.get('id') or payload.get('title') or f'agent-{int(time.time())}'
    file_name = sanitize_filename(name) + '.json'
    payload['_source'] = source
    payload['_updatedAt'] = int(time.time())
    destination = AGENT_LIBRARY_DIR / file_name
    destination.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    return {'ok': True, 'file': file_name, 'name': name, 'downloadUrl': f'/agent_library/{file_name}'}


def import_agent_from_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'OpenBoBS/1.0'})
    with urllib.request.urlopen(req, timeout=20) as response:
        parsed = json.loads(response.read().decode('utf-8', errors='ignore'))
    return save_agent(parsed, source=url)


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
            METRICS['healthChecks'] += 1
            try:
                self._json(200, ollama_health())
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'models': [], 'error': str(err)})
            return
        if self.path == '/api/ollama/status':
            METRICS['ollamaStatusChecks'] += 1
            try:
                self._json(200, ollama_health())
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'models': [], 'error': str(err)})
            return
        if self.path == '/api/runtime':
            METRICS['runtimeChecks'] += 1
            self._json(200, {'ok': True, 'host': HOST, 'port': PORT, 'ollamaUrl': OLLAMA_URL})
            return
        if self.path == '/api/runtime/metrics':
            self._json(200, {'ok': True, 'metrics': METRICS, 'uptimeSeconds': int(time.time() - STARTED_AT)})
            return
        if self.path == '/api/agents/library':
            METRICS['agentLibraryReads'] += 1
            self._json(200, list_agent_library())
            return
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        payload = json.loads(self.rfile.read(length).decode('utf-8') or '{}')

        if self.path == '/api/chat':
            METRICS['chatRequests'] += 1
            try:
                reply = ollama_chat(payload.get('messages', []), payload.get('model', 'llama3.1:8b'))
                self._json(200, {'ok': True, 'reply': reply})
            except urllib.error.URLError as err:
                self._json(200, {'ok': False, 'error': f'Ollama unavailable: {err}'})
            except Exception as err:  # noqa: BLE001
                self._json(500, {'ok': False, 'error': str(err)})
            return
        if self.path == '/api/search':
            METRICS['searchRequests'] += 1
            query = payload.get('query', '').strip()
            if not query:
                self._json(400, {'ok': False, 'error': 'query required'})
                return
            try:
                self._json(200, web_search(query))
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'error': str(err), 'results': []})
            return
        if self.path == '/api/agents/import':
            METRICS['agentImports'] += 1
            url = payload.get('url', '').strip()
            if not url:
                self._json(400, {'ok': False, 'error': 'url required'})
                return
            try:
                self._json(200, import_agent_from_url(url))
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'error': str(err)})
            return
        if self.path == '/api/agents/save':
            METRICS['agentSaves'] += 1
            agent = payload.get('agent')
            try:
                self._json(200, save_agent(agent))
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'error': str(err)})
            return

        self._json(404, {'ok': False, 'error': 'Not found'})


if __name__ == '__main__':
    print(f'OpenBoBS server running at http://{HOST}:{PORT}')
    print(f'Ollama endpoint: {OLLAMA_URL}')
    print(f'Agent library: {AGENT_LIBRARY_DIR}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
