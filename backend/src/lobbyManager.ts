import { v4 as uuidv4 } from 'uuid';
import type { Lobby, Player, GameState } from './types.js';

export class LobbyManager {
	private lobbies: Map<string, Lobby> = new Map();
	private lobbyCodeToId: Map<string, string> = new Map();

	generateLobbyCode(): string {
		// Generate a 6-character alphanumeric code
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let code = '';
		for (let i = 0; i < 6; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		// Ensure uniqueness
		if (this.lobbyCodeToId.has(code)) {
			return this.generateLobbyCode();
		}

		return code;
	}

	createLobby(hostPlayer: Player): Lobby {
		const lobbyId = uuidv4();
		const code = this.generateLobbyCode();

		const lobby: Lobby = {
			id: lobbyId,
			code,
			hostId: hostPlayer.id,
			players: [{ ...hostPlayer, isHost: true }],
			gameState: null,
			createdAt: new Date()
		};

		this.lobbies.set(lobbyId, lobby);
		this.lobbyCodeToId.set(code, lobbyId);

		return lobby;
	}

	getLobbyByCode(code: string): Lobby | undefined {
		const lobbyId = this.lobbyCodeToId.get(code.toUpperCase());
		return lobbyId ? this.lobbies.get(lobbyId) : undefined;
	}

	getLobbyById(lobbyId: string): Lobby | undefined {
		return this.lobbies.get(lobbyId);
	}

	addPlayerToLobby(lobbyId: string, player: Player): boolean {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return false;

		// Check if player already exists
		const existingPlayer = lobby.players.find((p) => p.id === player.id);
		if (existingPlayer) return false;

		lobby.players.push(player);
		return true;
	}

	removePlayerFromLobby(lobbyId: string, playerId: string): boolean {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return false;

		const playerIndex = lobby.players.findIndex((p) => p.id === playerId);
		if (playerIndex === -1) return false;

		lobby.players.splice(playerIndex, 1);

		// If lobby is empty or host left, delete the lobby
		if (lobby.players.length === 0 || playerId === lobby.hostId) {
			this.deleteLobby(lobbyId);
		} else {
			// Assign new host if needed
			if (!lobby.players.find((p) => p.isHost)) {
				lobby.players[0].isHost = true;
				lobby.hostId = lobby.players[0].id;
			}
		}

		return true;
	}

	updateGameState(lobbyId: string, gameState: unknown): boolean {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return false;

		lobby.gameState = gameState as GameState;
		return true;
	}

	deleteLobby(lobbyId: string): void {
		const lobby = this.lobbies.get(lobbyId);
		if (lobby) {
			this.lobbyCodeToId.delete(lobby.code);
			this.lobbies.delete(lobbyId);
		}
	}

	// Clean up old lobbies (older than 24 hours)
	cleanupOldLobbies(): void {
		const now = new Date();
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

		for (const [lobbyId, lobby] of this.lobbies.entries()) {
			if (now.getTime() - lobby.createdAt.getTime() > maxAge) {
				this.deleteLobby(lobbyId);
			}
		}
	}
}
