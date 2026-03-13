import { isValidLobbyCode, normalizeLobbyCode } from './lobbyCode';

export const joinCodeSearchParam = 'join';

export function getJoinCodeFromSearch(search: string | URLSearchParams): string | null {
	const params = typeof search === 'string' ? new URLSearchParams(search) : search;
	const rawCode = params.get(joinCodeSearchParam);
	if (!rawCode) {
		return null;
	}

	const code = normalizeLobbyCode(rawCode);
	return isValidLobbyCode(code) ? code : null;
}

export function buildJoinGameUrl(code: string, origin: string): string {
	const normalizedCode = normalizeLobbyCode(code);
	const url = new URL('/', origin);
	url.searchParams.set(joinCodeSearchParam, normalizedCode);
	return url.toString();
}
