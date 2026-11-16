/*
 * RescueMesh Stage 3 — Tests 2 & 3
 * ESP32 + Ra-02 Gateway: LoRa receive → parse → MQTT publish
 *
 * This sketch does NOT invent SOS data.
 * It waits for a Ra-02 LoRa packet from the T-Beam, then publishes that
 * incident information to topic: rescuemesh/incidents
 *
 * Flow:
 *   T-Beam → 433 MHz LoRa → Ra-02/ESP32 → Wi-Fi MQTT → Flask → DB → Dashboard
 *
 * Libraries:
 *   - LoRa by Sandeep Mistry
 *   - PubSubClient by Nick O'Leary
 *   - ArduinoJson by Benoit Blanchon
 *
 * Test 2: confirm Serial shows RX + "MQTT publish OK"
 * Test 3: confirm dashboard creates e.g. RM-00194 automatically
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <LoRa.h>

// ====== EDIT THESE ======
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER   = "trolley.proxy.rlwy.net";  // Railway "mqtt" service TCP proxy
const uint16_t MQTT_PORT  = 40036;
const char* MQTT_TOPIC    = "rescuemesh/incidents";
const char* MQTT_USER     = "rescuemesh";
const char* MQTT_PASS     = "d62384cd0be5b4621912f0c37d57eb4f";

const char* GATEWAY_ID    = "GATEWAY_001";
// ========================

// ====== LoRa (must match T-Beam exactly) ======
const long    LORA_FREQUENCY = 433E6;
const int     LORA_SF        = 7;
const long    LORA_BW        = 125E3;
const int     LORA_CR        = 5;
const uint8_t LORA_SYNC      = 0x12;

#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  26

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void connectWiFi() {
  Serial.printf("Connecting Wi-Fi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi OK, IP=");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi failed");
  }
}

void connectMqtt() {
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  while (!mqtt.connected()) {
    Serial.printf("Connecting MQTT %s:%u ...\n", MQTT_BROKER, MQTT_PORT);
    String clientId = String("rescuemesh-gw-") + String((uint32_t)ESP.getEfuseMac(), HEX);
    bool ok = (strlen(MQTT_USER) > 0)
      ? mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)
      : mqtt.connect(clientId.c_str());
    if (ok) {
      Serial.println("MQTT connected");
      return;
    }
    Serial.printf("MQTT failed rc=%d — retry in 3s\n", mqtt.state());
    delay(3000);
  }
}

bool initLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa init failed");
    return false;
  }
  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(LORA_BW);
  LoRa.setCodingRate4(LORA_CR);
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.enableCrc();
  Serial.println("LoRa RX ready on 433 MHz");
  return true;
}

/**
 * Accepts the T-Beam LoRa JSON and enriches it with gateway / RF metadata
 * before MQTT publish. Does not invent category/coords — those come from T-Beam.
 */
bool publishReceivedSos(const String& loraPayload, int rssi, float snr) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, loraPayload);
  if (err) {
    Serial.printf("JSON parse failed: %s\n", err.c_str());
    Serial.println(loraPayload);
    return false;
  }

  if (!doc.containsKey("device_id") || !doc.containsKey("category")) {
    Serial.println("Payload missing device_id/category");
    return false;
  }

  doc["gateway_id"] = GATEWAY_ID;
  doc["rssi_dbm"] = rssi;
  doc["snr_db"] = snr;
  doc["source"] = "mqtt";

  char buffer[512];
  size_t n = serializeJson(doc, buffer, sizeof(buffer));
  bool ok = mqtt.publish(MQTT_TOPIC, buffer, false);

  Serial.printf("MQTT publish %s (%u bytes)\n", ok ? "OK" : "FAIL", (unsigned)n);
  Serial.println(buffer);
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nRescueMesh Gateway — Stage 3 LoRa → MQTT");

  if (!initLoRa()) {
    while (true) delay(1000);
  }

  connectWiFi();
  connectMqtt();
  Serial.println("Waiting for T-Beam LoRa SOS...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  int packetSize = LoRa.parsePacket();
  if (packetSize <= 0) return;

  String payload;
  payload.reserve(packetSize);
  while (LoRa.available()) {
    payload += (char)LoRa.read();
  }

  int rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();

  Serial.println("---- LoRa RX ----");
  Serial.printf("bytes=%d RSSI=%d SNR=%.1f\n", packetSize, rssi, snr);
  Serial.println(payload);

  publishReceivedSos(payload, rssi, snr);
}
