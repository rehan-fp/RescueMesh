#!/bin/sh
set -e

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "MQTT_USERNAME and MQTT_PASSWORD must be set" >&2
  exit 1
fi

PASSWD_FILE=/mosquitto/config/passwd
rm -f "$PASSWD_FILE"
touch "$PASSWD_FILE"
mosquitto_passwd -b "$PASSWD_FILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 0700 "$PASSWD_FILE"

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
