export interface Player {
	id: string;
	name: string;
	image: string;
	position?: number;
	isHost?: boolean;
}

export interface GameState {
	players: Player[];
	turn: number;
	currentTurnPlayerId: string | null;
	inGame: boolean;
}

export interface Lobby {
	id: string;
	code: string;
	hostId: string;
	players: Player[];
	gameState: GameState | null;
	createdAt: Date;
}

export enum MessageType {
	// Lobby messages
	CREATE_LOBBY = 'CREATE_LOBBY',
	JOIN_LOBBY = 'JOIN_LOBBY',
	LEAVE_LOBBY = 'LEAVE_LOBBY',
	LOBBY_CREATED = 'LOBBY_CREATED',
	LOBBY_JOINED = 'LOBBY_JOINED',
	PLAYER_JOINED = 'PLAYER_JOINED',
	PLAYER_LEFT = 'PLAYER_LEFT',
	
	// Game messages
	START_GAME = 'START_GAME',
	GAME_STARTED = 'GAME_STARTED',
	UPDATE_GAME_STATE = 'UPDATE_GAME_STATE',
	GAME_STATE_UPDATED = 'GAME_STATE_UPDATED',
	
	// Error messages
	ERROR = 'ERROR'
}

export interface WSMessage {
	type: MessageType;
	payload?: any;
}
