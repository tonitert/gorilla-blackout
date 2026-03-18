export type MultiplayerConnectionState = 'connected' | 'connecting' | 'disconnected' | 'invalid';

export type MultiplayerPermanentErrorCode =
	| 'invalid_session'
	| 'lobby_closed'
	| 'player_removed';

const permanentErrorCodes = new Set<MultiplayerPermanentErrorCode>([
	'invalid_session',
	'lobby_closed',
	'player_removed'
]);

export function isPermanentMultiplayerErrorCode(
	code: string | null | undefined
): code is MultiplayerPermanentErrorCode {
	return code !== undefined && code !== null && permanentErrorCodes.has(code as MultiplayerPermanentErrorCode);
}

export function canLocalMultiplayerPlayerAct(options: {
	mode: 'single' | 'multi';
	connectionState: MultiplayerConnectionState;
	localPlayerId: string | null;
	currentTurnPlayerId: string | null;
}): boolean {
	const { mode, connectionState, localPlayerId, currentTurnPlayerId } = options;
	if (mode !== 'multi') {
		return true;
	}

	return (
		connectionState === 'connected' &&
		localPlayerId !== null &&
		localPlayerId === currentTurnPlayerId
	);
}
