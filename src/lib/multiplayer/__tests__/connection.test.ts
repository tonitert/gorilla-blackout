import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	canLocalMultiplayerPlayerAct,
	isPermanentMultiplayerErrorCode
} from '$lib/multiplayer/connection';

describe('multiplayer connection helpers', () => {
	it('recognizes permanent multiplayer connection errors', () => {
		assert.equal(isPermanentMultiplayerErrorCode('invalid_session'), true);
		assert.equal(isPermanentMultiplayerErrorCode('lobby_closed'), true);
		assert.equal(isPermanentMultiplayerErrorCode('player_removed'), true);
		assert.equal(isPermanentMultiplayerErrorCode('transport close'), false);
		assert.equal(isPermanentMultiplayerErrorCode(undefined), false);
	});

	it('only allows multiplayer actions while connected and on the local turn', () => {
		assert.equal(
			canLocalMultiplayerPlayerAct({
				mode: 'single',
				connectionState: 'disconnected',
				localPlayerId: null,
				currentTurnPlayerId: null
			}),
			true
		);

		assert.equal(
			canLocalMultiplayerPlayerAct({
				mode: 'multi',
				connectionState: 'connected',
				localPlayerId: 'player-1',
				currentTurnPlayerId: 'player-1'
			}),
			true
		);

		assert.equal(
			canLocalMultiplayerPlayerAct({
				mode: 'multi',
				connectionState: 'connecting',
				localPlayerId: 'player-1',
				currentTurnPlayerId: 'player-1'
			}),
			false
		);

		assert.equal(
			canLocalMultiplayerPlayerAct({
				mode: 'multi',
				connectionState: 'connected',
				localPlayerId: 'player-1',
				currentTurnPlayerId: 'player-2'
			}),
			false
		);
	});
});
