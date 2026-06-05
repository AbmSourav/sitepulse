FROM php:8.5-fpm

ARG UID=1000
ARG GID=1000

RUN apt-get update && apt-get install -y \
        git \
        curl \
        zip \
        unzip \
        libzip-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo_mysql zip && docker-php-ext-enable pdo_mysql

RUN pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && rm -rf /tmp/pear

RUN apt-get update && apt-get install -y autoconf \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/bin --filename=composer

COPY docker-configs/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini

RUN usermod -u ${UID} www-data \
    && groupmod -g ${GID} www-data

WORKDIR /var/www/html

USER www-data

EXPOSE 9000

CMD ["php-fpm"]
