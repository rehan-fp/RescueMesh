/*
 * RescueMesh Stage 3 — Production gateway
 * ESP32 + Ra-02 Gateway: LoRa receive → parse → HTTPS POST /api/v1/sos
 *
 * This sketch does NOT invent SOS data.
 * It waits for a Ra-02 LoRa packet from the T-Beam, adds gateway / RF metadata
 * and POSTs it to the RescueMesh backend over verified TLS.
 *
 * Flow:
 *   T-Beam → 433 MHz LoRa → Ra-02/ESP32 → Wi-Fi HTTPS → Flask → DB → Dashboard
 *
 * Libraries:
 *   - LoRa by Sandeep Mistry
 *   - ArduinoJson by Benoit Blanchon
 *   - WiFiClientSecure / HTTPClient (bundled with the ESP32 Arduino core)
 *
 * Success: Serial shows "SOS POST 201" and the dashboard shows a new RM-xxxxx.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <LoRa.h>

// ====== EDIT THESE ======
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SOS_URL         = "https://backend-production-58d40.up.railway.app/api/v1/sos";
// Railway backend variable GATEWAY_API_KEY: `railway variables --service backend`
const char* GATEWAY_API_KEY = "YOUR_GATEWAY_API_KEY";

const char* GATEWAY_ID    = "GATEWAY_001";
// ========================

const uint8_t  POST_ATTEMPTS      = 3;
const uint32_t POST_RETRY_BASE_MS = 2000;
const uint16_t HTTP_TIMEOUT_MS    = 15000;

// Railway serves *.up.railway.app with Let's Encrypt certificates; trust both ISRG roots.
static const char LETSENCRYPT_ROOTS[] PROGMEM =
"-----BEGIN CERTIFICATE-----\n"
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n"
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n"
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n"
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n"
"A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n"
"T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n"
"B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n"
"B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n"
"KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n"
"OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n"
"jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n"
"qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n"
"rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"
"HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\n"
"hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\n"
"ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n"
"3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\n"
"NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\n"
"ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\n"
"TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\n"
"jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\n"
"oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n"
"4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\n"
"mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\n"
"emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n"
"-----END CERTIFICATE-----\n"
"-----BEGIN CERTIFICATE-----\n"
"MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw\n"
"CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg\n"
"R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00\n"
"MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT\n"
"ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw\n"
"EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW\n"
"+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9\n"
"ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T\n"
"AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI\n"
"zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW\n"
"tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1\n"
"/q4AaOeMSQ+2b1tbFfLn\n"
"-----END CERTIFICATE-----\n";

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

WiFiClientSecure tlsClient;

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

// TLS certificate validity checks need a real clock.
void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Syncing time");
  time_t now = time(nullptr);
  uint8_t attempts = 0;
  while (now < 1700000000 && attempts < 40) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }
  Serial.println(now >= 1700000000 ? " OK" : " FAILED (TLS may be rejected)");
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

// Returns the HTTP status, or a negative HTTPClient error code on network/TLS failure.
int postSos(const char* body, size_t length) {
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(tlsClient, SOS_URL)) {
    return HTTPC_ERROR_CONNECTION_REFUSED;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", GATEWAY_API_KEY);
  int status = http.POST((uint8_t*)body, length);
  if (status > 0) {
    Serial.printf("SOS POST %d: %s\n", status, http.getString().c_str());
  } else {
    Serial.printf("SOS POST failed: %s\n", http.errorToString(status).c_str());
  }
  http.end();
  return status;
}

/**
 * Accepts the T-Beam LoRa JSON and enriches it with gateway / RF metadata
 * before POSTing. Does not invent category/coords — those come from T-Beam.
 */
bool forwardReceivedSos(const String& loraPayload, int rssi, float snr) {
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

  char buffer[512];
  size_t n = serializeJson(doc, buffer, sizeof(buffer));
  Serial.println(buffer);

  for (uint8_t attempt = 1; attempt <= POST_ATTEMPTS; attempt++) {
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
    int status = postSos(buffer, n);
    if (status == 200 || status == 201) return true;
    // 4xx means the payload or API key is wrong; retrying will not help.
    if (status >= 400 && status < 500) return false;
    if (attempt < POST_ATTEMPTS) {
      uint32_t wait = POST_RETRY_BASE_MS * attempt;
      Serial.printf("Retrying in %lu ms (%u/%u)\n", (unsigned long)wait, attempt + 1, POST_ATTEMPTS);
      delay(wait);
    }
  }
  Serial.println("SOS could not be delivered");
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nRescueMesh Gateway — LoRa → HTTPS");

  if (!initLoRa()) {
    while (true) delay(1000);
  }

  connectWiFi();
  syncClock();
  tlsClient.setCACert(LETSENCRYPT_ROOTS);
  Serial.println("Waiting for T-Beam LoRa SOS...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

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

  forwardReceivedSos(payload, rssi, snr);
}
