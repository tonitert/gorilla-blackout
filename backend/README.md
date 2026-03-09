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
- `POST /api/lobbies/:code/player` update player name/image before game starts
- `POST /api/lobbies/:code/start` start the game as host

Socket events:

- `lobby:update`
- `game:state`
- `game:state:update`
