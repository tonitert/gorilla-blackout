import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { LobbyManager } from './lobbyManager.js';
import { WebSocketManager } from './websocketManager.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize managers
const lobbyManager = new LobbyManager();
const websocketManager = new WebSocketManager(wss, lobbyManager);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/lobby/:code', (req, res) => {
	const { code } = req.params;
	const lobby = lobbyManager.getLobbyByCode(code);
	
	if (!lobby) {
		return res.status(404).json({ error: 'Lobby not found' });
	}
	
	res.json({
		code: lobby.code,
		players: lobby.players,
		hasStarted: lobby.gameState !== null
	});
});

// Cleanup old lobbies every hour
setInterval(
	() => {
		lobbyManager.cleanupOldLobbies();
		console.log('Cleaned up old lobbies');
	},
	60 * 60 * 1000
);

server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
	console.log(`WebSocket server is running on ws://localhost:${PORT}/ws`);
});
