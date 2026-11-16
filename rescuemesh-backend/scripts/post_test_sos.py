#!/usr/bin/env python3
"""
Simulate an ESP32 gateway REST uplink (verification without hardware).

Usage:
  cd rescuemesh-backend
  source venv/bin/activate
  python scripts/post_test_sos.py [BASE_URL] [SEQUENCE]

BASE_URL defaults to http://localhost:5001; GATEWAY_API_KEY is read from .env.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

base_url = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001").rstrip("/")
sequence = int(sys.argv[2]) if len(sys.argv) > 2 else 1
api_key = (os.getenv("GATEWAY_API_KEY") or "").split(",")[0].strip()
if not api_key:
    print("Set GATEWAY_API_KEY in .env first.")
    sys.exit(1)

payload = {
    "device_id": "NODE_001",
    "gateway_id": "GATEWAY_001",
    "category": "MEDICAL",
    "latitude": 7.2083,
    "longitude": 79.8358,
    "battery": 85,
    "gps_status": True,
    "sequence": sequence,
    "rssi_dbm": -88,
    "snr_db": 7.1,
}

body = json.dumps(payload).encode()
request = urllib.request.Request(
    f"{base_url}/api/v1/sos",
    data=body,
    method="POST",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": api_key,
        "X-Ingestion-Source": "API_TEST",
    },
)
print(f"POST {request.full_url} [Source: API_TEST]")
print(body.decode())

try:
    with urllib.request.urlopen(request, timeout=15) as response:
        print(response.status, response.read().decode())
except urllib.error.HTTPError as exc:
    print(exc.code, exc.read().decode())
    sys.exit(1)
