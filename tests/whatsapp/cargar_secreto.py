#!/usr/bin/env python3
"""Carga el secreto desde el .env local, sin argv/logs/archivos intermedios con valores."""
import argparse
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--env', required=True, type=Path)
args = parser.parse_args()
values = {}
for line in args.env.read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('\"\'')
secret = values.get('YCLOUD_WEBHOOK_SECRET')
if not secret:
    raise SystemExit('Falta YCLOUD_WEBHOOK_SECRET en el archivo local; no se modificó config.')
# psql recibe el valor por stdin. No hay interpolación del secreto en shell/argv.
encoded = json.dumps({'secret': secret}).replace("'", "''")
sql = "UPDATE config SET valor = ('" + encoded + "'::jsonb)->>'secret' WHERE clave='ycloud_webhook_secret';\n"
result = subprocess.run(['docker', 'exec', '-i', 'houseturing_postgres', 'sh', '-c',
    'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d dropship'], input=sql, text=True, capture_output=True)
if result.returncode or 'UPDATE 1' not in result.stdout:
    raise SystemExit('Falló la carga; salida omitida para proteger el secreto.')
print('Secreto cargado en config; valor oculto.')
