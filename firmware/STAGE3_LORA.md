# RescueMesh Stage 3 — start with Test 1 only

Flask, MQTT, database and the dashboard **do not matter** until Test 1 works.

## Test 1 success condition

```text
Press SOS on T-Beam
        ↓
T-Beam creates JSON
        ↓
433 MHz LoRa transmission
        ↓
Ra-02 receives packet
        ↓
ESP32 Serial Monitor prints valid JSON
```

Serial JSON must show: `device_id`, `category`, `latitude` / `longitude`, `timestamp`, `gps_fix`.

- Indoor / no fix: fallback coords are OK for the prototype; `gps_fix` must be `false` and `gps_source` = `"fallback"`.
- Outdoor fix: `gps_fix` = `true`, `gps_source` = `"gps"`.

### Milestone statement (after Test 1 passes)

> Successfully established 433 MHz LoRa communication between the T-Beam emergency node and the ESP32 + Ra-02 gateway, with structured SOS data successfully received and verified through the gateway Serial Monitor.

### Flash these two sketches only

| Board | Sketch |
|-------|--------|
| T-Beam | `tbeam-node/tbeam_lora_sos/` |
| ESP32 + Ra-02 | `esp32-gateway/esp32_gateway_lora_rx_test/` |

Libraries: **LoRa**, **ArduinoJson**, **TinyGPSPlus** (T-Beam).

### Preflight before power

1. Ra-02 **VCC = 3.3 V** — never 5 V  
2. Common **GND** between ESP32 and Ra-02  
3. LoRa **antenna** on both boards  
4. Gateway `LORA_SS` / `LORA_RST` / `LORA_DIO0` match your wires  
5. Both radios: **433 MHz / SF7 / 125 kHz / sync `0x12`**

Default gateway pins (edit if different): SCK 18, MISO 19, MOSI 23, NSS 5, RST 14, DIO0 26.

### Report evidence when Test 1 works

- Photo of T-Beam setup  
- Photo of ESP32 + Ra-02 gateway  
- Screenshot of gateway Serial Monitor showing the received JSON  

That is your **LoRa communication milestone**.

---

## Later (only after Test 1)

**Test 2** — flash `esp32_gateway_lora_https/`: LoRa JSON + `gateway_id` / RSSI / SNR → `POST /api/v1/sos` over HTTPS with the `X-API-Key` header (value = Railway backend `GATEWAY_API_KEY`). Serial must show `SOS POST 201`. The older `esp32_gateway_lora_mqtt/` sketch targets the retired MQTT ingest path; the production backend no longer consumes MQTT.  

**Test 3** — Mosquitto + Flask + React: real T-Beam button → new `RM-xxxxx` on dashboard  

Then TabPFN.
