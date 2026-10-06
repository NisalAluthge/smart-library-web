/*
  Smart Library - ESP32 + MFRC522 RFID reader
  -------------------------------------------
  Reads a card UID and sends it to Supabase Realtime (broadcast channel
  "library-rfid"). The React kiosk listens to that channel.

  Libraries (Arduino IDE -> Library Manager): "MFRC522" by GithubCommunity
  Board: ESP32 Dev Module

  Wiring (MFRC522 -> ESP32):
    SDA(SS) -> GPIO 5      SCK  -> GPIO 18     MOSI -> GPIO 23
    MISO    -> GPIO 19     RST  -> GPIO 22     3.3V -> 3V3     GND -> GND

  Only the PUBLISHABLE key is used here. Never put the service_role key on the ESP32.
  This sketch has not been run against your hardware - test and adjust pins if needed.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SUPABASE_URL  = "https://YOUR-PROJECT-ID.supabase.co";
const char* SUPABASE_KEY  = "YOUR-PUBLISHABLE-KEY";
const char* DEVICE_ID     = "ESP32-01";

#define SS_PIN  5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

unsigned long lastScanMs = 0;
String lastUid = "";

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected");
}

String readUid() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void sendUid(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  WiFiClientSecure client;
  client.setInsecure();  // OK for development. For production, load the root certificate instead.
  HTTPClient http;
  http.begin(client, String(SUPABASE_URL) + "/realtime/v1/api/broadcast");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  String body = String("{\"messages\":[{\"topic\":\"library-rfid\",\"event\":\"scan\",\"payload\":{\"rfid_uid\":\"")
                + uid + "\",\"device_id\":\"" + DEVICE_ID + "\"},\"private\":false}]}";

  int code = http.POST(body);
  Serial.printf("Sent UID %s -> HTTP %d\n", uid.c_str(), code);  // 202 = accepted
  http.end();
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  connectWifi();
  Serial.println("Ready. Tap a card...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = readUid();
  Serial.println("Card UID: " + uid);  // copy this value into the student's RFID UID field

  // ignore the same card for 3 seconds (prevents double reads)
  if (uid != lastUid || millis() - lastScanMs > 3000) {
    sendUid(uid);
    lastUid = uid;
    lastScanMs = millis();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
