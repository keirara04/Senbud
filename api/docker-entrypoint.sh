#!/bin/sh
set -e

php artisan config:clear

# Set RUN_MIGRATIONS=false once migrations run as a separate release/pre-deploy step instead.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

# config/route/event/view caches in one go.
php artisan optimize

# Caches above are written as root; make sure www-data (Apache) can still write logs.
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
