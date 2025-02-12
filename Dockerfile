FROM node:18

# Für acme.sh: git, socat (falls Standalone Port 80/443)
RUN apt-get update && apt-get install -y git socat

# Wir setzen ein ENV:
ENV ACME_HOME=/opt/acme.sh

# 1) Klone & installiere acme.sh
RUN git clone https://github.com/acmesh-official/acme.sh.git /tmp/acme.sh \
    && cd /tmp/acme.sh \
    && ./acme.sh --install \
         --home $ACME_HOME \
         --no-profile \
         --nocron \
    # Dann Link anlegen => /usr/local/bin/acme.sh
    && ln -s $ACME_HOME/acme.sh /usr/local/bin/acme.sh \
    # Aufräumen:
    && rm -rf /tmp/acme.sh

# 2) Node/Express App
WORKDIR /app
COPY src/package*.json ./
RUN npm install
COPY src/ .

# 3) start.sh (entrypoint)
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
EXPOSE 443

CMD ["/start.sh"]
