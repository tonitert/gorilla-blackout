# Gorilla Blackout Backend

Backend server for multi-device mode in Gorilla Blackout game.

## Features

- RESTful API for lobby management
- WebSocket server for real-time game synchronization
- Automatic lobby cleanup

## Technology Stack

- Node.js with TypeScript
- Express.js for REST API
- WebSocket (ws library) for real-time communication
- Docker support

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
```

### Running in Development Mode

```bash
pnpm run dev
```

The server will start on `http://localhost:3001` with hot-reload enabled.

### Building

```bash
pnpm run build
```

### Running in Production Mode

```bash
pnpm run build
pnpm start
```

## Docker

### Build Docker Image

```bash
docker build -t gorilla-blackout-backend .
```

### Run with Docker Compose

From the root directory:

```bash
docker-compose up
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status.

### Get Lobby Information

```
GET /api/lobby/:code
```

Returns lobby information for the given join code.

## WebSocket Messages

Connect to `ws://localhost:3001/ws`

### Client → Server Messages

#### Create Lobby

```json
{
	"type": "CREATE_LOBBY",
	"payload": {
		"player": {
			"name": "Player Name",
			"image": "default"
		}
	}
}
```

#### Join Lobby

```json
{
	"type": "JOIN_LOBBY",
	"payload": {
		"code": "ABC123",
		"player": {
			"name": "Player Name",
			"image": "default"
		}
	}
}
```

#### Leave Lobby

```json
{
	"type": "LEAVE_LOBBY"
}
```

#### Start Game (Host only)

```json
{
	"type": "START_GAME",
	"payload": {
		"gameState": {
			/* game state object */
		}
	}
}
```

#### Update Game State

```json
{
	"type": "UPDATE_GAME_STATE",
	"payload": {
		"gameState": {
			/* updated game state */
		}
	}
}
```

### Server → Client Messages

#### Lobby Created

```json
{
	"type": "LOBBY_CREATED",
	"payload": {
		"lobbyId": "uuid",
		"code": "ABC123",
		"players": [
			/* player objects */
		]
	}
}
```

#### Lobby Joined

```json
{
	"type": "LOBBY_JOINED",
	"payload": {
		"lobbyId": "uuid",
		"code": "ABC123",
		"players": [
			/* player objects */
		],
		"gameState": null
	}
}
```

#### Player Joined (broadcast to others)

```json
{
	"type": "PLAYER_JOINED",
	"payload": {
		"player": {
			/* player object */
		},
		"players": [
			/* all players */
		]
	}
}
```

#### Player Left (broadcast)

```json
{
	"type": "PLAYER_LEFT",
	"payload": {
		"playerId": "uuid",
		"players": [
			/* remaining players */
		]
	}
}
```

#### Game Started (broadcast)

```json
{
	"type": "GAME_STARTED",
	"payload": {
		"gameState": {
			/* initial game state */
		}
	}
}
```

#### Game State Updated (broadcast)

```json
{
	"type": "GAME_STATE_UPDATED",
	"payload": {
		"gameState": {
			/* updated game state */
		}
	}
}
```

#### Error

```json
{
	"type": "ERROR",
	"payload": {
		"error": "Error message"
	}
}
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
