import { writable, type Writable } from 'svelte/store';
import { MessageType, type WSMessage, type Player, type Lobby } from './types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MultiplayerState {
	status: ConnectionStatus;
	lobby: Lobby | null;
	playerId: string | null;
	error: string | null;
}

export class WebSocketClient {
	private ws: WebSocket | null = null;
	private reconnectTimer: number | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private serverUrl: string;

	public state: Writable<MultiplayerState> = writable({
		status: 'disconnected',
		lobby: null,
		playerId: null,
		error: null
	});

	constructor(serverUrl: string = 'ws://localhost:3001/ws') {
		this.serverUrl = serverUrl;
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				resolve();
				return;
			}

			this.state.update((s) => ({ ...s, status: 'connecting', error: null }));

			try {
				this.ws = new WebSocket(this.serverUrl);

				this.ws.onopen = () => {
					console.log('WebSocket connected');
					this.reconnectAttempts = 0;
					this.state.update((s) => ({ ...s, status: 'connected' }));
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					this.state.update((s) => ({ ...s, status: 'error', error: 'Connection error' }));
					reject(error);
				};

				this.ws.onclose = () => {
					console.log('WebSocket disconnected');
					this.state.update((s) => ({ ...s, status: 'disconnected' }));
					this.attemptReconnect();
				};
			} catch (error) {
				console.error('Failed to create WebSocket:', error);
				this.state.update((s) => ({
					...s,
					status: 'error',
					error: 'Failed to connect to server'
				}));
				reject(error);
			}
		});
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.state.update((s) => ({ ...s, status: 'disconnected', lobby: null }));
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log('Max reconnect attempts reached');
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

		console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

		this.reconnectTimer = window.setTimeout(() => {
			this.connect().catch((error) => {
				console.error('Reconnection failed:', error);
			});
		}, delay);
	}

	private handleMessage(data: string) {
		try {
			const message: WSMessage = JSON.parse(data);
			console.log('Received message:', message);

			switch (message.type) {
				case MessageType.LOBBY_CREATED:
					this.state.update((s) => ({
						...s,
						lobby: {
							id: message.payload.lobbyId,
							code: message.payload.code,
							hostId: message.payload.players[0]?.id || '',
							players: message.payload.players,
							gameState: null
						}
					}));
					break;

				case MessageType.LOBBY_JOINED:
					this.state.update((s) => ({
						...s,
						lobby: {
							id: message.payload.lobbyId,
							code: message.payload.code,
							hostId: message.payload.players.find((p: Player) => p.isHost)?.id || '',
							players: message.payload.players,
							gameState: message.payload.gameState
						}
					}));
					break;

				case MessageType.PLAYER_JOINED:
					this.state.update((s) => {
						if (!s.lobby) return s;
						return {
							...s,
							lobby: {
								...s.lobby,
								players: message.payload.players
							}
						};
					});
					break;

				case MessageType.PLAYER_LEFT:
					this.state.update((s) => {
						if (!s.lobby) return s;
						return {
							...s,
							lobby: {
								...s.lobby,
								players: message.payload.players
							}
						};
					});
					break;

				case MessageType.GAME_STARTED:
					this.state.update((s) => {
						if (!s.lobby) return s;
						return {
							...s,
							lobby: {
								...s.lobby,
								gameState: message.payload.gameState
							}
						};
					});
					break;

				case MessageType.GAME_STATE_UPDATED:
					this.state.update((s) => {
						if (!s.lobby) return s;
						return {
							...s,
							lobby: {
								...s.lobby,
								gameState: message.payload.gameState
							}
						};
					});
					break;

				case MessageType.ERROR:
					console.error('Server error:', message.payload.error);
					this.state.update((s) => ({
						...s,
						error: message.payload.error
					}));
					break;
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	}

	private sendMessage(message: WSMessage) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.error('WebSocket is not connected');
			throw new Error('WebSocket is not connected');
		}

		this.ws.send(JSON.stringify(message));
	}

	createLobby(player: Player): void {
		this.sendMessage({
			type: MessageType.CREATE_LOBBY,
			payload: { player }
		});
	}

	joinLobby(code: string, player: Player): void {
		this.sendMessage({
			type: MessageType.JOIN_LOBBY,
			payload: { code, player }
		});
	}

	leaveLobby(): void {
		this.sendMessage({
			type: MessageType.LEAVE_LOBBY
		});
	}

	startGame(gameState: unknown): void {
		this.sendMessage({
			type: MessageType.START_GAME,
			payload: { gameState }
		});
	}

	updateGameState(gameState: unknown): void {
		this.sendMessage({
			type: MessageType.UPDATE_GAME_STATE,
			payload: { gameState }
		});
	}
}
