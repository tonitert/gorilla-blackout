import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canRemovePlayer, getNextHostAfterRemoval } from '../playerPermissions';

describe('multiplayer player permissions', () => {
	it('allows host to remove any player', () => {
		assert.equal(
			canRemovePlayer({ isHost: true, actorId: 'host-1', targetPlayerId: 'guest-1' }),
			true
		);
	});

	it('allows non-host to remove self only', () => {
		assert.equal(
			canRemovePlayer({ isHost: false, actorId: 'guest-1', targetPlayerId: 'guest-1' }),
			true
		);
		assert.equal(
			canRemovePlayer({ isHost: false, actorId: 'guest-1', targetPlayerId: 'guest-2' }),
			false
		);
	});

	it('returns first remaining player as next host', () => {
		assert.equal(getNextHostAfterRemoval(['a', 'b', 'c'], 'a'), 'b');
		assert.equal(getNextHostAfterRemoval(['a'], 'a'), null);
	});
});
