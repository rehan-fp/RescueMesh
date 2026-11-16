/*
 * RescueMesh Stage 3 — Test 1 ONLY
 * ESP32 + Ra-02 Gateway: LoRa receive → Serial Monitor
 *
 * Success condition:
 *   T-Beam SOS button → 433 MHz LoRa → this sketch prints the JSON
 *
 * Do NOT enable Wi-Fi / MQTT / Flask for this test.
 *
 * Board: ESP32 Dev Module + Ra-02 (SX1278)
 * Library: LoRa by Sandeep Mistry
 *
 * PREFLIGHT (before power-on):
 *   1. Ra-02 VCC = 3.3 V  (NOT 5 V — 5 V can destroy the module)
 *   2. Common GND between ESP32 and Ra-02
 *   3. LoRa antenna connected on Ra-02 AND on T-Beam
 *   4. NSS / RST / DIO0 macros below match your actual wires
 *   5. Same RF settings as T-Beam: 433 MHz / SF7 / 125 kHz / sync 0x12
 *
 * Report evidence when Test 1 works:
 *   - Photo of T-Beam setup
 *   - Photo of ESP32 + Ra-02 gateway
 *   - Screenshot of this Serial Monitor with the received JSON
 */

#include <SPI.h>
#include <LoRa.h>

// ====== LoRa — MUST match T-Beam exactly ======
const long    LORA_FREQUENCY = 433E6;   // 433 MHz
const int     LORA_SF        = 7;
const long    LORA_BW        = 125E3;   // 125 kHz
const int     LORA_CR        = 5;       // 4/5
const uint8_t LORA_SYNC      = 0x12;

// ESP32 ↔ Ra-02 wiring — EDIT THESE to match your breadboard/PCB
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_SS    5     // Ra-02 NSS / CS
#define LORA_RST   14    // Ra-02 RESET
#define LORA_DIO0  26    // Ra-02 DIO0

unsigned long packetCount = 0;

void printPreflight() {
  Serial.println();
  Serial.println("========================================");
  Serial.println(" RescueMesh Gateway — Stage 3 TEST 1");
  Serial.println(" LoRa RX → Serial only (no MQTT)");
  Serial.println("========================================");
  Serial.println("PREFLIGHT CHECKLIST:");
  Serial.println("  [ ] Ra-02 powered from 3.3V (not 5V)");
  Serial.println("  [ ] Common GND ESP32 <-> Ra-02");
  Serial.println("  [ ] Antenna on Ra-02 and T-Beam");
  Serial.println("  [ ] NSS/RST/DIO0 match wiring below");
  Serial.printf("Pins: SCK=%d MISO=%d MOSI=%d NSS=%d RST=%d DIO0=%d\n",
                LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS, LORA_RST, LORA_DIO0);
  Serial.println("RF: 433 MHz | SF7 | 125 kHz | sync 0x12 | CRC on");
  Serial.println("========================================");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  printPreflight();

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa init FAILED.");
    Serial.println("Recheck: 3.3V power, GND, NSS/RST/DIO0, 433 MHz Ra-02.");
    while (true) delay(1000);
  }

  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(LORA_BW);
  LoRa.setCodingRate4(LORA_CR);
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.enableCrc();

  Serial.println("Listening... press the T-Beam SOS button now.");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize <= 0) return;

  String payload;
  payload.reserve(packetSize + 1);
  while (LoRa.available()) {
    payload += (char)LoRa.read();
  }

  packetCount++;
  Serial.println();
  Serial.println("==== LoRa RX (Test 1 SUCCESS if JSON below) ====");
  Serial.printf("packet=#%lu bytes=%d RSSI=%d SNR=%.1f\n",
                packetCount, packetSize, LoRa.packetRssi(), LoRa.packetSnr());
  Serial.println(payload);
  Serial.println("Screenshot this Serial output for your project report.");
  Serial.println("=================================================");
}
