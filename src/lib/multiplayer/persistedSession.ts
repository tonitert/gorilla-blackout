import { getItem, removeItem, setItem } from '$lib/helpers/indexedDB';

const persistedMultiplayerSessionKey = 'persistedMultiplayerSession';

export type PersistedMultiplayerSession = {
	code: string;
	playerId: string;
};

type LobbyLike = {
	inGame: boolean;
	players: { id: string }[];
};

export function isPersistedMultiplayerSession(
	value: unknown
): value is PersistedMultiplayerSession {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<PersistedMultiplayerSession>;
	return typeof candidate.code === 'string' && typeof candidate.playerId === 'string';
}

export function canRejoinLobby(
	lobby: LobbyLike | null | undefined,
	playerId: string | null | undefined
): boolean {
	if (!lobby?.inGame || !playerId) {
		return false;
	}

	return lobby.players.some((player) => player.id === playerId);
}

export async function loadPersistedMultiplayerSession(): Promise<PersistedMultiplayerSession | null> {
	if (typeof window === 'undefined') {
		return null;
	}

	const storedSession = await getItem<unknown>(persistedMultiplayerSessionKey);
	return isPersistedMultiplayerSession(storedSession) ? storedSession : null;
}

export async function savePersistedMultiplayerSession(
	session: PersistedMultiplayerSession
): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	await setItem(persistedMultiplayerSessionKey, session);
}

export async function clearPersistedMultiplayerSession(): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	await removeItem(persistedMultiplayerSessionKey);
}
