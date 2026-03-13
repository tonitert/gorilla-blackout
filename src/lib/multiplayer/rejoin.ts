import { getItem, removeItem, setItem } from '$lib/helpers/indexedDB';
import { isValidLobbyCode, normalizeLobbyCode } from './lobbyCode';

const REJOIN_CODE_KEY = 'multiplayerRejoinCode';

export async function saveRejoinCode(code: string): Promise<void> {
	await setItem(REJOIN_CODE_KEY, normalizeLobbyCode(code));
}

export function parseRejoinCode(value: unknown): string | null {
	if (typeof value !== 'string' || !isValidLobbyCode(value)) {
		return null;
	}

	return normalizeLobbyCode(value);
}

export async function loadRejoinCode(): Promise<string | null> {
	const code = await getItem<string>(REJOIN_CODE_KEY);
	return parseRejoinCode(code);
}

export async function clearRejoinCode(): Promise<void> {
	await removeItem(REJOIN_CODE_KEY);
}
