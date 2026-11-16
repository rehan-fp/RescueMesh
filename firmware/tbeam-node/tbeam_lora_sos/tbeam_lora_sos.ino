/*
 * RescueMesh Stage 3 — Test 1 focus
 * T-Beam Community Emergency Node (433 MHz LoRa SOS sender)
 *
 * Success path for Test 1:
 *   SOS button → JSON (device/category/GPS/timestamp) → LoRa TX
 *   Gateway Serial Monitor must show the same JSON (MQTT/Flask OFF for Test 1)
 *
 * Board: LilyGo T-Beam — use the 433 MHz variant
 * Libraries: LoRa (Sandeep Mistry), ArduinoJson, TinyGPSPlus (Mikal Hart)
 *
 * Controls:
 *   - Press middle button (GPIO 38 classic T-Beam) → send SOS
 *   - Boot also sends one packet so you can verify without the button first
 */

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// ====== Node identity ======
const char* DEVICE_ID = "NODE_001";
const char* CATEGORY  = "Medical";  // Medical | Rescue | Food & Water | Shelter

// Emergency categories: Medical | Rescue | Food & Water | Shelter
// NOTE: Physical device never uses fake fallback coordinates. Missing GPS fix sends null coordinates.

// ====== LoRa — MUST match gateway exactly ======
const long    LORA_FREQUENCY = 433E6;   // 433 MHz
const int     LORA_SF        = 7;
const long    LORA_BW        = 125E3;   // 125 kHz
const int     LORA_CR        = 5;       // 4/5
const int     LORA_TX_POWER  = 17;
const uint8_t LORA_SYNC      = 0x12;

// Classic LilyGo T-Beam SX127x pins (change only if your revision differs)
#define LORA_SCK   5
#define LORA_MISO  19
#define LORA_MOSI  27
#define LORA_SS    18
#define LORA_RST   23
#define LORA_DIO0  26

// Middle button (active LOW)
#define BTN_SOS    38

// GPS UART on classic T-Beam
#define GPS_RX     34
#define GPS_TX     12

HardwareSerial GPSSerial(1);
TinyGPSPlus gps;

unsigned long lastSendMs = 0;
bool lastButtonState = HIGH;

String isoTimestampPlus0530() {
  // Prefer GPS date/time when valid; otherwise a lab placeholder.
  if (gps.date.isValid() && gps.time.isValid()) {
    char buf[40];
    snprintf(
      buf, sizeof(buf),
      "%04d-%02d-%02dT%02d:%02d:%02d+05:30",
      gps.date.year(), gps.date.month(), gps.date.day(),
      gps.time.hour(), gps.time.minute(), gps.time.second()
    );
    return String(buf);
  }
  return String("2026-09-30T23:30:00+05:30");
}

void feedGps(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    while (GPSSerial.available() > 0) {
      gps.encode(GPSSerial.read());
    }
  }
}

String buildSosJson() {
  feedGps(200);

  bool gpsFix = gps.location.isValid();

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["category"] = CATEGORY;
  if (gpsFix) {
    doc["latitude"] = gps.location.lat();
    doc["longitude"] = gps.location.lng();
    doc["gps_fix"] = true;
    doc["gps_source"] = "gps";
  } else {
    // When GPS satellite lock is unavailable, NEVER substitute fake coordinates.
    // Transmit null coordinates so backend marks as 'Location unavailable — waiting for GPS'.
    doc["latitude"] = (char*)NULL;
    doc["longitude"] = (char*)NULL;
    doc["gps_fix"] = false;
    doc["gps_source"] = "none";
  }
  doc["timestamp"] = isoTimestampPlus0530();

  String out;
  serializeJson(doc, out);
  return out;
}

bool sendSos(const char* reason) {
  String payload = buildSosJson();

  LoRa.beginPacket();
  LoRa.print(payload);
  bool ok = LoRa.endPacket();

  Serial.println("==== LoRa TX (Test 1) ====");
  Serial.printf("trigger=%s\n", reason);
  Serial.println(payload);
  Serial.printf("result=%s bytes=%u\n", ok ? "OK" : "FAIL", (unsigned)payload.length());
  Serial.println("Check gateway Serial for the same JSON (device_id, category, lat/lng, timestamp, gps_fix).");
  Serial.println("Press SOS button to send again.");
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("RescueMesh T-Beam — Stage 3 Test 1 sender");
  Serial.println("Preflight: LoRa antenna attached? 433 MHz board variant?");

  pinMode(BTN_SOS, INPUT_PULLUP);
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa init FAILED — check 433 MHz T-Beam / antenna / pins");
    while (true) delay(1000);
  }

  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(LORA_BW);
  LoRa.setCodingRate4(LORA_CR);
  LoRa.setTxPower(LORA_TX_POWER);
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.enableCrc();

  Serial.println("LoRa TX ready: 433 MHz / SF7 / 125 kHz / sync 0x12");
  Serial.println("Collecting GPS briefly (fallback coords used if no fix)...");
  feedGps(1500);

  sendSos("boot");
  lastSendMs = millis();
}

void loop() {
  feedGps(10);

  bool buttonState = digitalRead(BTN_SOS);
  if (lastButtonState == HIGH && buttonState == LOW) {
    delay(40);
    if (digitalRead(BTN_SOS) == LOW) {
      sendSos("button");
      lastSendMs = millis();
      while (digitalRead(BTN_SOS) == LOW) {
        feedGps(10);
      }
    }
  }
  lastButtonState = buttonState;
}
