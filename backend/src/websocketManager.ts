import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { LobbyManager } from './lobbyManager.js';
import { MessageType, type WSMessage, type Player } from './types.js';

export interface ClientConnection {
	ws: WebSocket;
	playerId: string;
	lobbyId: string | null;
}

export class WebSocketManager {
	private wss: WebSocketServer;
	private clients: Map<string, ClientConnection> = new Map();
	private lobbyManager: LobbyManager;

	constructor(wss: WebSocketServer, lobbyManager: LobbyManager) {
		this.wss = wss;
		this.lobbyManager = lobbyManager;
		this.setupWebSocketServer();
	}

	private setupWebSocketServer() {
		this.wss.on('connection', (ws: WebSocket) => {
			const clientId = uuidv4();
			const playerId = uuidv4();

			const client: ClientConnection = {
				ws,
				playerId,
				lobbyId: null
			};

			this.clients.set(clientId, client);

			console.log(`Client ${clientId} connected`);

			ws.on('message', (data: Buffer) => {
				this.handleMessage(clientId, data.toString());
			});

			ws.on('close', () => {
				this.handleDisconnect(clientId);
			});

			ws.on('error', (error) => {
				console.error(`WebSocket error for client ${clientId}:`, error);
			});
		});
	}

	private handleMessage(clientId: string, data: string) {
		try {
			const message: WSMessage = JSON.parse(data);
			const client = this.clients.get(clientId);

			if (!client) {
				console.error(`Client ${clientId} not found`);
				return;
			}

			switch (message.type) {
				case MessageType.CREATE_LOBBY:
					this.handleCreateLobby(client, message.payload);
					break;
				case MessageType.JOIN_LOBBY:
					this.handleJoinLobby(client, message.payload);
					break;
				case MessageType.LEAVE_LOBBY:
					this.handleLeaveLobby(client);
					break;
				case MessageType.START_GAME:
					this.handleStartGame(client, message.payload);
					break;
				case MessageType.UPDATE_GAME_STATE:
					this.handleUpdateGameState(client, message.payload);
					break;
				default:
					this.sendError(client.ws, `Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error('Error handling message:', error);
			const client = this.clients.get(clientId);
			if (client) {
				this.sendError(client.ws, 'Invalid message format');
			}
		}
	}

	private handleCreateLobby(client: ClientConnection, payload: { player: Player }) {
		try {
			const player: Player = {
				...payload.player,
				id: client.playerId,
				isHost: true
			};

			const lobby = this.lobbyManager.createLobby(player);
			client.lobbyId = lobby.id;

			this.sendMessage(client.ws, {
				type: MessageType.LOBBY_CREATED,
				payload: {
					lobbyId: lobby.id,
					code: lobby.code,
					players: lobby.players
				}
			});

			console.log(`Lobby ${lobby.code} created by player ${player.name}`);
		} catch (error) {
			console.error('Error creating lobby:', error);
			this.sendError(client.ws, 'Failed to create lobby');
		}
	}

	private handleJoinLobby(client: ClientConnection, payload: { code: string; player: Player }) {
		try {
			const { code, player } = payload;
			const lobby = this.lobbyManager.getLobbyByCode(code);

			if (!lobby) {
				this.sendError(client.ws, 'Lobby not found');
				return;
			}

			const newPlayer: Player = {
				...player,
				id: client.playerId,
				isHost: false
			};

			const added = this.lobbyManager.addPlayerToLobby(lobby.id, newPlayer);

			if (!added) {
				this.sendError(client.ws, 'Failed to join lobby');
				return;
			}

			client.lobbyId = lobby.id;

			// Notify the joining player
			this.sendMessage(client.ws, {
				type: MessageType.LOBBY_JOINED,
				payload: {
					lobbyId: lobby.id,
					code: lobby.code,
					players: lobby.players,
					gameState: lobby.gameState
				}
			});

			// Notify all other players in the lobby
			this.broadcastToLobby(
				lobby.id,
				{
					type: MessageType.PLAYER_JOINED,
					payload: {
						player: newPlayer,
						players: lobby.players
					}
				},
				client.playerId
			);

			console.log(`Player ${player.name} joined lobby ${code}`);
		} catch (error) {
			console.error('Error joining lobby:', error);
			this.sendError(client.ws, 'Failed to join lobby');
		}
	}

	private handleLeaveLobby(client: ClientConnection) {
		if (!client.lobbyId) {
			return;
		}

		const lobby = this.lobbyManager.getLobbyById(client.lobbyId);
		if (!lobby) {
			return;
		}

		const player = lobby.players.find((p) => p.id === client.playerId);

		this.lobbyManager.removePlayerFromLobby(client.lobbyId, client.playerId);

		// Notify remaining players
		const updatedLobby = this.lobbyManager.getLobbyById(client.lobbyId);
		if (updatedLobby) {
			this.broadcastToLobby(client.lobbyId, {
				type: MessageType.PLAYER_LEFT,
				payload: {
					playerId: client.playerId,
					players: updatedLobby.players
				}
			});
		}

		client.lobbyId = null;

		if (player) {
			console.log(`Player ${player.name} left lobby ${lobby.code}`);
		}
	}

	private handleStartGame(client: ClientConnection, payload: { gameState: unknown }) {
		if (!client.lobbyId) {
			this.sendError(client.ws, 'Not in a lobby');
			return;
		}

		const lobby = this.lobbyManager.getLobbyById(client.lobbyId);
		if (!lobby) {
			this.sendError(client.ws, 'Lobby not found');
			return;
		}

		// Only host can start the game
		if (client.playerId !== lobby.hostId) {
			this.sendError(client.ws, 'Only host can start the game');
			return;
		}

		this.lobbyManager.updateGameState(client.lobbyId, payload.gameState);

		// Notify all players that the game has started
		this.broadcastToLobby(client.lobbyId, {
			type: MessageType.GAME_STARTED,
			payload: {
				gameState: payload.gameState
			}
		});

		console.log(`Game started in lobby ${lobby.code}`);
	}

	private handleUpdateGameState(client: ClientConnection, payload: { gameState: unknown }) {
		if (!client.lobbyId) {
			this.sendError(client.ws, 'Not in a lobby');
			return;
		}

		const lobby = this.lobbyManager.getLobbyById(client.lobbyId);
		if (!lobby) {
			this.sendError(client.ws, 'Lobby not found');
			return;
		}

		this.lobbyManager.updateGameState(client.lobbyId, payload.gameState);

		// Broadcast updated game state to all other players
		this.broadcastToLobby(
			client.lobbyId,
			{
				type: MessageType.GAME_STATE_UPDATED,
				payload: {
					gameState: payload.gameState
				}
			},
			client.playerId
		);
	}

	private handleDisconnect(clientId: string) {
		const client = this.clients.get(clientId);
		if (client) {
			this.handleLeaveLobby(client);
			this.clients.delete(clientId);
		}
		console.log(`Client ${clientId} disconnected`);
	}

	private sendMessage(ws: WebSocket, message: WSMessage) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	private sendError(ws: WebSocket, error: string) {
		this.sendMessage(ws, {
			type: MessageType.ERROR,
			payload: { error }
		});
	}

	private broadcastToLobby(lobbyId: string, message: WSMessage, excludePlayerId?: string) {
		for (const client of this.clients.values()) {
			if (client.lobbyId === lobbyId && client.playerId !== excludePlayerId) {
				this.sendMessage(client.ws, message);
			}
		}
	}
}
