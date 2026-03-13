export function canRemovePlayer(args: {
	isHost: boolean;
	actorId: string | null;
	targetPlayerId: string | undefined;
}) {
	const { isHost, actorId, targetPlayerId } = args;
	if (!actorId || !targetPlayerId) {
		return false;
	}

	return isHost || actorId === targetPlayerId;
}

export function getNextHostAfterRemoval(playerIdsInOrder: string[], removedPlayerId: string) {
	const remaining = playerIdsInOrder.filter((playerId) => playerId !== removedPlayerId);
	return remaining[0] ?? null;
}
