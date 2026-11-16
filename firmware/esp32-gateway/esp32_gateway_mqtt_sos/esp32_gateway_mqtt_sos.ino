/*
 * RescueMesh Stage 2 — ESP32 + Ra-02 Gateway (MQTT test publisher)
 *
 * Goal for Stage 2:
 *   ESP32 --Wi-Fi--> MQTT Broker --> Flask --> Database --> Dashboard
 *
 * This sketch does NOT require the T-Beam yet.
 * It publishes a test SOS JSON every 30 seconds (and once on boot).
 *
 * Libraries (Arduino Library Manager):
 *   - PubSubClient by Nick O'Leary
 *   - ArduinoJson by Benoit Blanchon
 *
 * Board: ESP32 Dev Module (or your ESP32 + Ra-02 gateway board)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ====== EDIT THESE FOR YOUR NETWORK / BROKER ======
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER   = "trolley.proxy.rlwy.net";   // Railway "mqtt" service TCP proxy
const uint16_t MQTT_PORT  = 40036;
const char* MQTT_TOPIC    = "rescuemesh/incidents";
const char* MQTT_USER     = "rescuemesh";
const char* MQTT_PASS     = "d62384cd0be5b4621912f0c37d57eb4f";

const char* GATEWAY_ID    = "GATEWAY_001";
const char* DEVICE_ID     = "NODE_001";       // simulated Community Emergency Node
// ==================================================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_EVERY_MS = 30000;

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
    Serial.println("Wi-Fi failed — retrying in loop()");
  }
}

void connectMqtt() {
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);

  while (!mqtt.connected()) {
    Serial.printf("Connecting MQTT %s:%u ...\n", MQTT_BROKER, MQTT_PORT);
    String clientId = String("rescuemesh-gateway-") + String((uint32_t)ESP.getEfuseMac(), HEX);

    bool ok;
    if (strlen(MQTT_USER) > 0) {
      ok = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      ok = mqtt.connect(clientId.c_str());
    }

    if (ok) {
      Serial.println("MQTT connected");
      return;
    }

    Serial.printf("MQTT failed, rc=%d — retry in 3s\n", mqtt.state());
    delay(3000);
  }
}

String isoTimestampPlus0530() {
  // ESP32 wall-clock may be unset without NTP; Flask also accepts missing/bad timestamps.
  // Prefer NTP if available; otherwise send a placeholder ISO string.
  time_t now = time(nullptr);
  if (now < 1700000000) {
    return String("2026-09-30T23:15:00+05:30");
  }

  // Convert UTC epoch to +05:30 for the demo payload
  now += 5 * 3600 + 30 * 60;
  struct tm t;
  gmtime_r(&now, &t);

  char buf[40];
  snprintf(
    buf, sizeof(buf),
    "%04d-%02d-%02dT%02d:%02d:%02d+05:30",
    t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
    t.tm_hour, t.tm_min, t.tm_sec
  );
  return String(buf);
}

bool publishTestSos() {
  StaticJsonDocument<384> doc;
  doc["device_id"]  = DEVICE_ID;
  doc["gateway_id"] = GATEWAY_ID;
  doc["category"]   = "Medical";
  doc["latitude"]   = 7.2083;
  doc["longitude"]  = 79.8358;
  doc["timestamp"]  = isoTimestampPlus0530();
  doc["rssi_dbm"]   = -88;
  doc["snr_db"]     = 7.1;
  doc["source"]     = "mqtt";

  char buffer[384];
  size_t n = serializeJson(doc, buffer, sizeof(buffer));

  bool ok = mqtt.publish(MQTT_TOPIC, buffer, false);
  Serial.printf("Publish %s (%u bytes): %s\n", MQTT_TOPIC, (unsigned)n, ok ? "OK" : "FAIL");
  Serial.println(buffer);
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nRescueMesh ESP32 Gateway — Stage 2 MQTT SOS publisher");

  // Optional: enable NTP for better timestamps
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  connectWiFi();
  connectMqtt();
  publishTestSos();
  lastPublishMs = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqtt.connected()) {
    connectMqtt();
  }
  mqtt.loop();

  if (millis() - lastPublishMs >= PUBLISH_EVERY_MS) {
    publishTestSos();
    lastPublishMs = millis();
  }
}
