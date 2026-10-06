#!/bin/sh
php artisan schedule:work --quiet &
exec php artisan queue:work --sleep=1 --tries=3 --max-time=3600
