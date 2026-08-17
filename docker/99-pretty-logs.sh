#!/bin/sh
# Converte \033 literais em ESC real (nginx não interpreta a sequência no log_format).
esc="$(printf '\033')"
if [ -f /etc/nginx/conf.d/default.conf ]; then
  sed -i "s/\\\\033/${esc}/g" /etc/nginx/conf.d/default.conf
fi

# O notice do processo mestre vem de nginx.conf, não do server {}.
if [ -f /etc/nginx/nginx.conf ]; then
  sed -i 's|error_log  /var/log/nginx/error.log notice;|error_log /dev/stderr warn;|' /etc/nginx/nginx.conf
  sed -i 's|worker_processes  auto;|worker_processes  2;|' /etc/nginx/nginx.conf
fi
