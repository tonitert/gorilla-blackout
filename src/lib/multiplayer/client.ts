import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { clearGameState, gameStateStore, type GameState } from '$lib/gameState.svelte';

export type GameMode = 'single' | 'multi';

export type LobbyPlayer = { id: string; name: string; image: string; position: number };
export type Lobby = { code: string; hostId: string; players: LobbyPlayer[]; inGame: boolean };

type Session = {
	mode: GameMode;
	code: string | null;
	playerId: string | null;
	isHost: boolean;
	lobby: Lobby | null;
};

const backendUrl = import.meta.env.PUBLIC_BACKEND_URL ?? 'https://api.blackout.beer';

const defaultSession: Session = {
	mode: 'single',
	code: null,
	playerId: null,
	isHost: false,
	lobby: null
};

export const multiplayerStore = writable<Session>(defaultSession);
export const serverDiceRollStore = writable<number | null>(null);

let socket: Socket | null = null;
let suppressSync = false;
let previousBroadcastPhase: GameState['phase'] | null = null;

async function post<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`${backendUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!response.ok) throw new Error(await response.text());
	return response.json();
}

function disconnectAndResetSession(mode: GameMode = 'single') {
	socket?.disconnect();
	socket = null;
	suppressSync = false;
	previousBroadcastPhase = null;
	serverDiceRollStore.set(null);
	multiplayerStore.set({ ...defaultSession, mode });
}

export async function createLobby(name: string, image: string) {
	const payload = await post<{ code: string; playerId: string; lobby: Lobby }>('/api/lobbies', {
		name,
		image
	});
	multiplayerStore.update((state) => ({
		...state,
		mode: 'multi',
		code: payload.code,
		playerId: payload.playerId,
		isHost: true,
		lobby: payload.lobby
	}));
	connect();
}

export async function joinLobby(code: string, name: string, image: string) {
	const payload = await post<{ code: string; playerId: string; lobby: Lobby }>(
		`/api/lobbies/${code.toUpperCase()}/join`,
		{ name, image }
	);
	multiplayerStore.update((state) => ({
		...state,
		mode: 'multi',
		code: payload.code,
		playerId: payload.playerId,
		isHost: false,
		lobby: payload.lobby
	}));
	connect();
}

export async function updateLobbyPlayer(data: { name?: string; image?: string }) {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) return;
	const payload = await post<{ lobby: Lobby }>(`/api/lobbies/${session.code}/player`, {
		playerId: session.playerId,
		...data
	});
	multiplayerStore.update((state) => ({ ...state, lobby: payload.lobby }));
}

export async function removeLobbyPlayer(targetPlayerId: string) {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) return;
	const payload = await post<{
		lobby: Lobby | null;
		removedPlayerId: string;
		lobbyClosed: boolean;
		hostReassigned: boolean;
		gameEnded: boolean;
	}>(`/api/lobbies/${session.code}/player/remove`, {
		actorId: session.playerId,
		targetPlayerId
	});

	if (payload.removedPlayerId === session.playerId || payload.lobbyClosed) {
		disconnectAndResetSession('single');
		clearGameState();
		return;
	}

	multiplayerStore.update((state) => ({
		...state,
		isHost: payload.lobby?.hostId === state.playerId,
		lobby: payload.lobby
	}));
}

export async function quitCurrentGame() {
	const session = get(multiplayerStore);
	if (session.mode === 'multi' && session.code && session.playerId) {
		try {
			await removeLobbyPlayer(session.playerId);
			return;
		} catch {
			// If network request fails, still allow local user to exit the game view.
		}
	}

	disconnectAndResetSession('single');
	clearGameState();
}

function connect() {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) return;
	socket?.disconnect();
	socket = io(backendUrl, { auth: { code: session.code, playerId: session.playerId } });
	socket.on('lobby:update', (lobby: Lobby) => {
		multiplayerStore.update((state) => ({ ...state, lobby }));
		if (!lobby.inGame) {
			clearGameState();
		}
	});
	socket.on('lobby:closed', () => {
		disconnectAndResetSession('single');
		clearGameState();
	});
	socket.on('lobby:player-removed', (payload: { playerId?: string }) => {
		const removedPlayerId = payload?.playerId;
		if (!removedPlayerId) return;
		if (removedPlayerId !== session.playerId) return;
		disconnectAndResetSession('single');
		clearGameState();
	});
	socket.on('game:state', (state: GameState) => {
		const enteringRollingPhase =
			state.phase === 'rolling' && state.diceValue === null && previousBroadcastPhase !== 'rolling';

		previousBroadcastPhase = state.phase;
		suppressSync = true;
		gameStateStore.set(state);
		suppressSync = false;
		if (enteringRollingPhase) {
			serverDiceRollStore.set(null);
		}
	});
	socket.on('game:roll', (value: number) => {
		if (Number.isInteger(value) && value >= 1 && value <= 6) {
			serverDiceRollStore.set(value);
		}
	});
}

export function requestServerDiceRoll() {
	const session = get(multiplayerStore);
	if (session.mode !== 'multi' || !session.code || !session.playerId) return;
	socket?.emit('game:roll:request', { actorId: session.playerId });
}

export async function startLobbyGame() {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) return;
	const payload = await post<{ lobby: Lobby }>(`/api/lobbies/${session.code}/start`, {
		playerId: session.playerId
	});
	multiplayerStore.update((state) => ({ ...state, lobby: payload.lobby }));
}

export function enableMultiplayerSync() {
	return gameStateStore.subscribe((state) => {
		const session = get(multiplayerStore);
		if (session.mode !== 'multi' || !session.code || suppressSync || !state.inGame) return;
		socket?.emit('game:state:update', {
			actorId: session.playerId,
			state: structuredClone(state)
		});
	});
}

export function setMode(mode: GameMode) {
	if (mode === 'single') {
		disconnectAndResetSession('single');
		return;
	}
	multiplayerStore.update((state) => ({ ...state, mode }));
}
