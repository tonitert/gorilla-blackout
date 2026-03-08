FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
EXPOSE 3001
CMD ["pnpm","dev"]
