FROM node:22-alpine3.22 AS builder

COPY . /app

WORKDIR /app

RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile && \
    pnpm run build


FROM nginx:1.29.1-alpine3.22-perl

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80