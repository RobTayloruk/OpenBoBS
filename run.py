#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
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
STARTED_AT = time.time()

METRICS = {
    'chatRequests': 0,
    'searchRequests': 0,
    'kaliToolRuns': 0,
    'kaliCatalogChecks': 0,
    'agentToolContextRequests': 0,
    'healthChecks': 0,
    'runtimeChecks': 0,
}

# Broad Kali catalog visibility (inventory only).
KALI_CATALOG = [
    'nmap', 'nikto', 'sqlmap', 'gobuster', 'wpscan', 'hydra', 'ffuf', 'amass', 'whatweb',
    'dirb', 'dirbuster', 'john', 'hashcat', 'aircrack-ng', 'metasploit-framework', 'msfconsole',
    'wireshark', 'tcpdump', 'bettercap', 'zaproxy', 'burpsuite', 'enum4linux', 'smbclient',
    'netcat', 'snmpwalk', 'responder', 'crackmapexec', 'impacket-secretsdump', 'theharvester',
    'dnsenum', 'masscan', 'recon-ng', 'sublist3r', 'seclists',
]

# Explicit safe execution allowlist (info/version checks only).
KALI_SAFE_COMMANDS = {
    'nmap': ['nmap', '--version'],
    'nikto': ['nikto', '-Version'],
    'sqlmap': ['sqlmap', '--version'],
    'gobuster': ['gobuster', 'version'],
    'wpscan': ['wpscan', '--version'],
    'ffuf': ['ffuf', '-V'],
    'amass': ['amass', 'version'],
    'whatweb': ['whatweb', '--version'],
    'tcpdump': ['tcpdump', '--version'],
}


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


def web_search(query):
    url = f'https://duckduckgo.com/html/?q={urllib.parse.quote(query)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')

    matches = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html)
    results = []
    for link, title in matches[:6]:
        clean_title = re.sub(r'<[^>]+>', '', title).strip()
        results.append({'title': clean_title, 'url': link})
    return {'ok': True, 'results': results}


def kali_catalog_status():
    return {
        'ok': True,
        'tools': [
            {
                'name': name,
                'installed': bool(shutil.which(name)),
                'safeRunnable': name in KALI_SAFE_COMMANDS,
                'safeCheck': ' '.join(KALI_SAFE_COMMANDS[name]) if name in KALI_SAFE_COMMANDS else 'inventory-only',
            }
            for name in KALI_CATALOG
        ],
    }


def kali_launch(tool):
    if tool not in KALI_SAFE_COMMANDS:
        return {'ok': False, 'error': f'{tool} is not enabled for execution. Inventory is available via catalog.'}
    if not shutil.which(tool):
        return {'ok': False, 'error': f'{tool} is not installed in this runtime'}

    cmd = KALI_SAFE_COMMANDS[tool]
    completed = subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=False)
    output = (completed.stdout or completed.stderr or '').strip()[:1200]
    return {'ok': completed.returncode == 0, 'tool': tool, 'command': ' '.join(cmd), 'output': output}


def agent_tools_context(active_agents):
    catalog = kali_catalog_status()['tools']
    installed = [tool['name'] for tool in catalog if tool['installed']]
    safe = [tool['name'] for tool in catalog if tool['installed'] and tool['safeRunnable']]
    return {
        'ok': True,
        'activeAgents': active_agents,
        'tooling': {
            'installedCount': len(installed),
            'safeRunnableCount': len(safe),
            'safeRunnableTools': safe[:12],
            'catalogSample': installed[:18],
        },
    }


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

        if self.path == '/api/runtime':
            METRICS['runtimeChecks'] += 1
            self._json(200, {'ok': True, 'host': HOST, 'port': PORT, 'ollamaUrl': OLLAMA_URL})
            return

        if self.path == '/api/runtime/metrics':
            self._json(200, {'ok': True, 'metrics': METRICS, 'uptimeSeconds': int(time.time() - STARTED_AT)})
            return

        if self.path == '/api/kali/tools':
            METRICS['kaliCatalogChecks'] += 1
            self._json(200, kali_catalog_status())
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
                messages = payload.get('messages', [])
                model = payload.get('model', 'llama3.1:8b')
                reply = ollama_chat(messages, model)
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

        if self.path == '/api/kali/run':
            METRICS['kaliToolRuns'] += 1
            tool = payload.get('tool', '').strip().lower()
            try:
                self._json(200, kali_launch(tool))
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'error': str(err)})
            return

        if self.path == '/api/agent/tools-context':
            METRICS['agentToolContextRequests'] += 1
            active_agents = payload.get('activeAgents', [])
            self._json(200, agent_tools_context(active_agents))
            return

        self._json(404, {'ok': False, 'error': 'Not found'})


if __name__ == '__main__':
    print(f'OpenBoBS server running at http://{HOST}:{PORT}')
    print(f'Ollama endpoint: {OLLAMA_URL}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
