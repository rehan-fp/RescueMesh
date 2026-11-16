# RescueMesh AI 🚨
### AI-Powered Off-Grid Emergency Mesh Network & Disaster Dispatch Platform

RescueMesh AI is a hybrid hardware-software disaster management platform designed for resilient emergency communication and automated crisis triage during catastrophic flooding and cellular blackout scenarios.

---

## 🌐 System Architecture

```text
       [ LilyGO T-Beam ]
    (GPS + LoRa 433 MHz Node)
               │  LoRa RF (433 MHz)
               ▼
     [ ESP32 + Ra-02 Gateway ]
               │  HTTPS REST / MQTT (TLS)
               ▼
     [ RescueMesh Backend ]
    (Flask + SQLAlchemy + PostgreSQL)
               │
        ┌──────┴─────────────────────────┐
        ▼                                ▼
[ TabPFN AI Triage Engine ]   [ Real-Time SSE Broadcaster ]
(Priority / Risk Assessment)  (Live Dispatch Synchronization)
                                         │
                                         ▼
                             [ Operations Command Center ]
                               (React + Vite + Leaflet GIS)
```

1. **Edge LoRa Beacons (Hardware Nodes)**:
   - Built on **LilyGO TTGO T-Beam v1.1/v1.2** with Semtech SX1278 (433 MHz) transceiver and NEO-6M/NEO-8N GPS.
   - Operates fully off-grid during power and cellular network failures.
   - Encodes structured emergency payloads (device ID, emergency category, satellite GPS fix, battery, hardware telemetry).
2. **LoRa-to-Cloud Gateway**:
   - ESP32 microcontroller with Ra-02 LoRa module receives distress packets and forwards them over WiFi/Cellular uplink via HTTPS REST or MQTT.
   - Automatic sequence deduplication, cryptographic HMAC API key validation, and RF link quality telemetry (RSSI, SNR).
3. **AI Triage & Decision Engine**:
   - **TabPFN (Prior-Data Fitted Networks)** and decision tree classifiers for real-time emergency prioritization (`Critical`, `High`, `Medium`, `Low`).
   - Dynamic geographic flood risk analysis and localized multi-SOS cluster density detection.
4. **Operations Command Center Dashboard**:
   - Live Emergency Operations Dashboard built with React, Vite, Tailwind CSS, and Leaflet GIS.
   - Authoritative operational Sri Lanka / India timezone (`Asia/Colombo` · `UTC+05:30`).
   - Role-based incident lifecycle management (New → Acknowledged → Assigned → In Progress → Resolved).
   - SLIIT Exhibition mode: smart GPS fallback ensuring indoor exhibition nodes display accurately on campus maps while strictly maintaining verified GPS integrity.

---

## 📁 Repository Structure

```text
RescuMesh/
├── firmware/
│   ├── tbeam-node/
│   │   └── tbeam_lora_sos/               # LilyGO T-Beam SOS transmission firmware
│   └── esp32-gateway/
│       ├── esp32_gateway_lora_https/     # LoRa 433 MHz -> HTTPS REST gateway
│       ├── esp32_gateway_lora_mqtt/      # LoRa 433 MHz -> MQTT gateway
│       └── esp32_gateway_mqtt_sos/       # Direct MQTT test publisher
├── rescuemesh-backend/
│   ├── ai/                              # TabPFN classifier, feature engineering & flood risk models
│   ├── migrations/                      # Alembic schema migrations (PostgreSQL / SQLite)
│   ├── models/                          # SQLAlchemy database entities (Incident, Team, Device, SOS)
│   ├── routes/                          # REST API endpoints (Auth, Incidents, SOS Ingestion, Teams, System)
│   ├── services/                        # Ingest pipeline, reverse geocoding, SSE event broadcaster
│   ├── tests/                           # Pytest integration & unit test suite
│   ├── app.py                           # Application factory
│   └── wsgi.py                          # Production WSGI entry point
├── rescuemesh-ai/
│   ├── src/
│   │   ├── components/                  # Dashboard, Map, Incident Management, Response Teams, Analytics
│   │   ├── context/                     # Emergency operational context & SSE listeners
│   │   ├── utils/                       # Asia/Colombo date & time formatting, clustering, sound alerts
│   │   └── types/                       # TypeScript operational domain definitions
│   └── package.json                     # Frontend dependencies & build scripts
├── rescuemesh-mqtt/                     # Eclipse Mosquitto broker configuration & Dockerfile
└── README.md
```

---

## ⚡ Quick Start

### 1. Backend Service (Flask + Python 3.9+)

```bash
cd rescuemesh-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Apply database migrations
flask db upgrade

# Run local development server
python wsgi.py
```

### 2. Frontend Command Center (React + Vite)

```bash
cd rescuemesh-ai

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### 3. Firmware Flashing (Arduino IDE / PlatformIO)

- **T-Beam Emergency Node**: Flash `firmware/tbeam-node/tbeam_lora_sos/tbeam_lora_sos.ino`.
  - Required Libraries: `LoRa`, `ArduinoJson` (v6+), `TinyGPSPlus`, `AXP202X_Library`.
  - Radio parameters: 433 MHz, Spreading Factor 7, Bandwidth 125 kHz, Sync Word `0x12`.
- **ESP32 Gateway**: Flash `firmware/esp32-gateway/esp32_gateway_lora_https/esp32_gateway_lora_https.ino`.
  - Configure WiFi credentials and backend `GATEWAY_API_KEY`.

---

## 📍 Exhibition Mode & Indoor GPS Fallback

Designed specifically for indoor venues (such as the SLIIT Exhibition) where satellite GPS fix is obstructed:
- **Real GPS Fixed**: When genuine GPS satellite lock is present, exact latitude and longitude are preserved and marked `location_source = GPS_FIXED`.
- **Indoor Fallback**: When satellites are unavailable, actual coordinates remain `null`, and configured campus coordinates (`6.914678, 79.972946` — SLIIT Malabe Campus) are used for map display with `location_source = CONFIGURED_VENUE`.
- **Integrity**: Unverified coordinates are strictly excluded from automated flood risk calculations and geographic AI clusters.

---

## 🕒 Operational Timezone

RescueMesh operations are standardized to **`Asia/Colombo` (`UTC+05:30`)**:
- All timestamps in the database and API payloads are stored and serialized as canonical UTC ISO-8601 (`...Z`).
- The frontend UI guarantees consistent `Asia/Colombo` (+05:30) presentation across all tables, maps, timeline audits, and cards regardless of client machine settings.

---

## 🧪 Testing & Verification

```bash
# Run backend test suite
cd rescuemesh-backend
pytest tests/ -v

# Run frontend unit tests
cd rescuemesh-ai
npm test
```

---

## 📜 License

MIT License. Designed and developed for emergency disaster resilience and humanitarian assistance.
