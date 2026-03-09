FROM node:22-alpine3.22 AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . /app

RUN pnpm run build

FROM nginx:1.29.1-alpine3.22-perl

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80