import { writable, get } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { clearGameState, gameStateStore, type GameState } from '$lib/gameState.svelte';
import {
	canRejoinLobby,
	clearPersistedMultiplayerSession,
	loadPersistedMultiplayerSession,
	savePersistedMultiplayerSession,
	type PersistedMultiplayerSession
} from './persistedSession';

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

export type MultiplayerResumeAvailability =
	| {
			status: 'available';
			session: PersistedMultiplayerSession;
			lobby: Lobby;
	  }
	| {
			status: 'unavailable';
			session: PersistedMultiplayerSession | null;
			lobby: null;
	  };

const backendUrl =
	import.meta.env.VITE_PUBLIC_BACKEND_URL ??
	import.meta.env.PUBLIC_BACKEND_URL ??
	'https://api.blackout.beer';

const defaultSession: Session = {
	mode: 'single',
	code: null,
	playerId: null,
	isHost: false,
	lobby: null
};

const initialResumeAvailability: MultiplayerResumeAvailability = {
	status: 'unavailable',
	session: null,
	lobby: null
};

export const multiplayerStore = writable<Session>(defaultSession);
export const serverDiceRollStore = writable<number | null>(null);

let socket: Socket | null = null;
let suppressSync = false;
let previousBroadcastPhase: GameState['phase'] | null = null;

class RequestError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'RequestError';
		this.status = status;
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${backendUrl}${path}`, init);
	if (!response.ok) {
		const message = (await response.text()) || response.statusText;
		throw new RequestError(response.status, message);
	}
	return response.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
	return request<T>(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function getJson<T>(path: string): Promise<T> {
	return request<T>(path);
}

async function clearPersistedSessionSafely() {
	try {
		await clearPersistedMultiplayerSession();
	} catch (error) {
		console.error('Failed to clear persisted multiplayer session:', error);
	}
}

async function persistSessionSafely(session: PersistedMultiplayerSession) {
	try {
		await savePersistedMultiplayerSession(session);
	} catch (error) {
		console.error('Failed to persist multiplayer session:', error);
	}
}

function resetSession(mode: GameMode = 'single') {
	socket?.disconnect();
	socket = null;
	suppressSync = false;
	previousBroadcastPhase = null;
	serverDiceRollStore.set(null);
	multiplayerStore.set({ ...defaultSession, mode });
}

function buildSession(session: PersistedMultiplayerSession, lobby: Lobby): Session {
	return {
		mode: 'multi',
		code: session.code,
		playerId: session.playerId,
		isHost: lobby.hostId === session.playerId,
		lobby
	};
}

async function fetchLobby(code: string): Promise<Lobby> {
	const payload = await getJson<{ lobby: Lobby }>(`/api/lobbies/${code.toUpperCase()}`);
	return payload.lobby;
}

function connect(options?: {
	waitForGameState?: boolean;
	timeoutMs?: number;
}): Promise<void> | undefined {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) {
		return options?.waitForGameState
			? Promise.reject(new Error('Missing multiplayer session'))
			: undefined;
	}

	socket?.disconnect();
	socket = io(backendUrl, { auth: { code: session.code, playerId: session.playerId } });
	const activeSocket = socket;

	let initialStatePromise: Promise<void> | undefined;
	if (options?.waitForGameState) {
		initialStatePromise = new Promise<void>((resolve, reject) => {
			if (!activeSocket) {
				reject(new Error('Socket initialization failed'));
				return;
			}

			let settled = false;
			const timeoutMs = options.timeoutMs ?? 10_000;
			const timeoutId = window.setTimeout(() => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(new Error('Timed out waiting for multiplayer game state'));
			}, timeoutMs);

			const cleanup = () => {
				window.clearTimeout(timeoutId);
				activeSocket.off('game:state', onInitialGameState);
				activeSocket.off('connect_error', onConnectError);
				activeSocket.off('disconnect', onDisconnect);
			};

			const onInitialGameState = () => {
				if (settled) return;
				settled = true;
				cleanup();
				resolve();
			};

			const onConnectError = (error: Error) => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(error);
			};

			const onDisconnect = (reason: string) => {
				if (settled || reason !== 'io server disconnect') return;
				settled = true;
				cleanup();
				reject(new Error('Disconnected before multiplayer state arrived'));
			};

			activeSocket.on('game:state', onInitialGameState);
			activeSocket.on('connect_error', onConnectError);
			activeSocket.on('disconnect', onDisconnect);
		});
	}

	activeSocket.on('lobby:update', (lobby: Lobby) => {
		multiplayerStore.update((state) => ({
			...state,
			lobby,
			isHost: lobby.hostId === state.playerId
		}));
		if (!lobby.inGame) {
			clearGameState();
		}
	});
	activeSocket.on('lobby:closed', () => {
		void clearPersistedSessionSafely();
		resetSession('single');
		clearGameState();
	});
	activeSocket.on('lobby:player-removed', (payload: { playerId?: string }) => {
		const removedPlayerId = payload?.playerId;
		if (!removedPlayerId) return;
		if (removedPlayerId !== session.playerId) return;
		void clearPersistedSessionSafely();
		resetSession('single');
		clearGameState();
	});
	activeSocket.on('game:state', (state: GameState) => {
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
	activeSocket.on('game:roll', (value: number) => {
		if (Number.isInteger(value) && value >= 1 && value <= 6) {
			serverDiceRollStore.set(value);
		}
	});

	return initialStatePromise;
}

export async function getMultiplayerResumeAvailability(): Promise<MultiplayerResumeAvailability> {
	if (typeof window === 'undefined') {
		return initialResumeAvailability;
	}

	const persistedSession = await loadPersistedMultiplayerSession();
	if (!persistedSession) {
		return initialResumeAvailability;
	}

	try {
		const lobby = await fetchLobby(persistedSession.code);
		if (!canRejoinLobby(lobby, persistedSession.playerId)) {
			await clearPersistedSessionSafely();
			return initialResumeAvailability;
		}

		return {
			status: 'available',
			session: persistedSession,
			lobby
		};
	} catch (error) {
		if (error instanceof RequestError && error.status === 404) {
			await clearPersistedSessionSafely();
			return initialResumeAvailability;
		}

		return {
			status: 'unavailable',
			session: persistedSession,
			lobby: null
		};
	}
}

export async function rejoinMultiplayerGame(session: PersistedMultiplayerSession): Promise<void> {
	const lobby = await fetchLobby(session.code);
	if (!canRejoinLobby(lobby, session.playerId)) {
		await clearPersistedSessionSafely();
		throw new Error('Persisted multiplayer session is no longer valid');
	}

	multiplayerStore.set(buildSession(session, lobby));

	try {
		await persistSessionSafely(session);
		await connect({ waitForGameState: true });
	} catch (error) {
		resetSession('single');
		throw error;
	}
}

export async function createLobby(name: string, image: string) {
	const payload = await post<{ code: string; playerId: string; lobby: Lobby }>('/api/lobbies', {
		name,
		image
	});
	const session = { code: payload.code, playerId: payload.playerId };
	multiplayerStore.set(buildSession(session, payload.lobby));
	await persistSessionSafely(session);
	connect();
}

export async function joinLobby(code: string, name: string, image: string) {
	const payload = await post<{ code: string; playerId: string; lobby: Lobby }>(
		`/api/lobbies/${code.toUpperCase()}/join`,
		{ name, image }
	);
	const session = { code: payload.code, playerId: payload.playerId };
	multiplayerStore.set(buildSession(session, payload.lobby));
	await persistSessionSafely(session);
	connect();
}

export async function updateLobbyPlayer(data: { name?: string; image?: string }) {
	const session = get(multiplayerStore);
	if (!session.code || !session.playerId) return;
	const payload = await post<{ lobby: Lobby }>(`/api/lobbies/${session.code}/player`, {
		playerId: session.playerId,
		...data
	});
	multiplayerStore.update((state) => ({
		...state,
		isHost: payload.lobby.hostId === state.playerId,
		lobby: payload.lobby
	}));
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
		await clearPersistedSessionSafely();
		resetSession('single');
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

	await clearPersistedSessionSafely();
	resetSession('single');
	clearGameState();
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
	multiplayerStore.update((state) => ({
		...state,
		isHost: payload.lobby.hostId === state.playerId,
		lobby: payload.lobby
	}));
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
		resetSession('single');
		return;
	}
	multiplayerStore.update((state) => ({ ...state, mode }));
}
