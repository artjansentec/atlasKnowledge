# Build da aplicação React/Vite
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Servir arquivos estáticos com nginx
FROM nginx:alpine

ENV PORT=80

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/99-pretty-logs.sh /docker-entrypoint.d/99-pretty-logs.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /entrypoint.sh /docker-entrypoint.d/99-pretty-logs.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
