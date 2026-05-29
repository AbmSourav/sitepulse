#!/usr/bin/env bash

# Bootstrap script — runs once via Lightsail user_data on first boot.
# Logs to /var/log/sitepulse-bootstrap.log
set -euo pipefail
exec > >(tee -a /var/log/sitepulse-bootstrap.log) 2>&1

echo "=== SitePulse bootstrap started at $(date) ==="

# ── 1. System update ─────────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# ── 2. Base tools ─────────────────────────────────────────────────────────────
apt-get install -y \
    git curl unzip supervisor acl cron \
    software-properties-common apt-transport-https ca-certificates gnupg

# ── 3. PHP 8.5 ───────────────────────────────────────────────────────────────
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y \
    php8.5-fpm \
    php8.5-mysql \
    php8.5-zip \
    php8.5-mbstring \
    php8.5-xml \
    php8.5-curl \
    php8.5-bcmath \
    php8.5-gd \
    php8.5-intl

# ── 4. PHP production settings ───────────────────────────────────────────────
cat > /etc/php/8.5/fpm/conf.d/99-sitepulse.ini <<'EOF'
memory_limit = 256M
opcache.enable = 1
opcache.validate_timestamps = 0
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
expose_php = Off
display_errors = Off
log_errors = On
date.timezone = UTC
EOF

# ── 5. PHP-FPM pool ──────────────────────────────────────────────────────────
cat > /etc/php/8.5/fpm/pool.d/sitepulse.conf <<'EOF'
[sitepulse]
user = www-data
group = www-data
listen = /run/php/php8.5-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 10
pm.start_servers = 3
pm.min_spare_servers = 2
pm.max_spare_servers = 5
pm.max_requests = 500
EOF

# Remove the default www pool
rm -f /etc/php/8.5/fpm/pool.d/www.conf

systemctl enable php8.5-fpm
systemctl restart php8.5-fpm

# ── 6. Composer ──────────────────────────────────────────────────────────────
EXPECTED_CHECKSUM="$(php -r 'copy("https://composer.github.io/installer.sig", "php://stdout");')"
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
    echo "ERROR: Composer installer checksum mismatch" >&2
    rm composer-setup.php
    exit 1
fi

php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php

# ── 7. Node 22 ───────────────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# ── 8. MySQL 8.0 ─────────────────────────────────────────────────────────────
apt-get install -y mysql-server

# Ensure MySQL only listens on localhost — port 3306 must never be exposed externally
# UFW default-deny already blocks it, but defense-in-depth: bind to 127.0.0.1 at the process level
sed -i 's/^bind-address\s*=.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf
grep -q '^bind-address' /etc/mysql/mysql.conf.d/mysqld.cnf \
    || echo 'bind-address = 127.0.0.1' >> /etc/mysql/mysql.conf.d/mysqld.cnf

systemctl enable mysql
systemctl start mysql

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS sitepulse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sitepulse'@'127.0.0.1' IDENTIFIED BY '${SITEPULSE_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON sitepulse.* TO 'sitepulse'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

# ── 9. Caddy (standard binary from official apt repo) ────────────────────────
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

# ── 10. Caddy system user and service ────────────────────────────────────────
# The official Caddy apt package creates the caddy user and systemd service automatically.
# Add caddy to www-data group so it can access the PHP-FPM socket.
usermod -aG www-data caddy

# Write placeholder Caddyfile — real one is deployed by CI on first deploy
cat > /etc/caddy/Caddyfile <<'EOF'
:80 {
    respond "Bootstrap in progress — deploy will replace this" 200
}
EOF

systemctl enable caddy
systemctl start caddy

# ── 11. App directory and permissions ────────────────────────────────────────
mkdir -p /var/www/sitepulse
chown -R www-data:www-data /var/www/sitepulse

# Allow the ubuntu user to deploy files
usermod -aG www-data ubuntu

# Pre-create persistent storage directories
mkdir -p \
    /var/www/sitepulse/storage/app/public \
    /var/www/sitepulse/storage/framework/cache \
    /var/www/sitepulse/storage/framework/sessions \
    /var/www/sitepulse/storage/framework/views \
    /var/www/sitepulse/storage/logs \
    /var/www/sitepulse/bootstrap/cache

chown -R www-data:www-data /var/www/sitepulse/storage /var/www/sitepulse/bootstrap/cache

# Set ACLs so future files inherit the right permissions
setfacl -R -m u:www-data:rwx /var/www/sitepulse/storage /var/www/sitepulse/bootstrap/cache
setfacl -R -d -m u:www-data:rwx /var/www/sitepulse/storage /var/www/sitepulse/bootstrap/cache
setfacl -R -m u:ubuntu:rwx /var/www/sitepulse/storage /var/www/sitepulse/bootstrap/cache
setfacl -R -d -m u:ubuntu:rwx /var/www/sitepulse/storage /var/www/sitepulse/bootstrap/cache

# ── 12. Supervisor ───────────────────────────────────────────────────────────
# Supervisor config is deployed by CI; just ensure the service is enabled.
systemctl enable supervisor
systemctl start supervisor

# ── 13. Cron for Laravel scheduler ───────────────────────────────────────────
echo "* * * * * www-data php /var/www/sitepulse/artisan schedule:run >> /dev/null 2>&1" \
    >> /etc/crontab

# ── 14. UFW firewall ─────────────────────────────────────────────────────────
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== SitePulse bootstrap completed at $(date) ==="
