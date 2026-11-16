FROM eclipse-mosquitto:2

COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY entrypoint.sh /rescuemesh-entrypoint.sh
RUN chmod +x /rescuemesh-entrypoint.sh

EXPOSE 1883

ENTRYPOINT ["/rescuemesh-entrypoint.sh"]
