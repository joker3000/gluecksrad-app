My son's 1st GitHub repo

Nutzung

docker-compose up -d dgr_nginx gluecksrad-app.

Certbot (einmalig):

docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email $SSL_EMAIL \
  -d $DOMAIN_NAME \
  --rsa-key-size 4096 \
  --agree-tos
docker-compose restart dgr_nginx.

Auf https://yoururl/ → siehst Du index.html => Button => /auth/login => MS-Login => /game.html.

Admin => surfe https://yoururl/admin. Nur der ADMIN_EMAIL-Benutzer kann rein.

Du hast:
Alle Login via MS-AUTH
Spin-Logik in game.js (3-Spins, roter Marker, 3s Pause).
Admin in admin.html/admin.js, nur zugänglich via user.isAdmin.
Sensible Variablen in .env.