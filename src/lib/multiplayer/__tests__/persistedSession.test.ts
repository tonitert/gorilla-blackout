import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canRejoinLobby, isPersistedMultiplayerSession } from '$lib/multiplayer/persistedSession';

describe('persisted multiplayer session helpers', () => {
	it('recognizes a valid persisted multiplayer session shape', () => {
		assert.equal(
			isPersistedMultiplayerSession({
				code: 'ABC123',
				playerId: 'player-1'
			}),
			true
		);
	});

	it('rejects invalid persisted multiplayer session values', () => {
		assert.equal(isPersistedMultiplayerSession(null), false);
		assert.equal(isPersistedMultiplayerSession({ code: 'ABC123' }), false);
		assert.equal(isPersistedMultiplayerSession({ playerId: 'player-1' }), false);
		assert.equal(
			isPersistedMultiplayerSession({
				code: 123,
				playerId: 'player-1'
			}),
			false
		);
	});

	it('allows rejoin only when the player is still present in an in-progress lobby', () => {
		const lobby = {
			inGame: true,
			players: [{ id: 'host' }, { id: 'guest' }]
		};

		assert.equal(canRejoinLobby(lobby, 'guest'), true);
		assert.equal(canRejoinLobby(lobby, 'missing'), false);
		assert.equal(canRejoinLobby({ ...lobby, inGame: false }, 'guest'), false);
		assert.equal(canRejoinLobby(null, 'guest'), false);
	});
});
