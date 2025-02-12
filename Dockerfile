FROM node:18

# 1) Install dependencies for acme.sh
RUN apt-get update && apt-get install -y git socat

# 2) Clone acme.sh
RUN git clone https://github.com/acmesh-official/acme.sh /opt/acme.sh && \
    cd /opt/acme.sh && \
    ./acme.sh --install --home /opt/acme.sh --no-profile --nocron

# 3) Node app
WORKDIR /app
COPY src/package*.json ./
RUN npm install

COPY src/ .
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
EXPOSE 443

CMD ["/start.sh"]
