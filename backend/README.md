# Gorilla Blackout backend

Fastify + Socket.IO backend for multiplayer lobbies.

## Run locally

```bash
pnpm install
pnpm dev
```

Server runs on `http://localhost:3001`.

## API

- `POST /api/lobbies` create lobby with host
- `POST /api/lobbies/:code/join` join lobby by code
- `GET /api/lobbies/:code` fetch lobby info

Socket events:

- `lobby:update`
- `game:start`
- `game:state`
- `game:state:update`
