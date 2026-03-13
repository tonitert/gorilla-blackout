import test from 'node:test';
import assert from 'node:assert/strict';
import { gameRollRequestSchema, gameStateUpdateSchema } from '../socketPayload.js';

const validState = {
	players: [
		{
			id: 'p1',
			name: 'Player 1',
			image: 'default',
			position: 0
		}
	],
	turn: 0,
	currentTurnPlayerId: 'p1',
	turnInProgress: false,
	turnOwnerId: null,
	phase: 'idle',
	activeTilePosition: null,
	activeTileTrigger: null,
	activeTileSessionId: 0,
	diceValue: null,
	tileState: null,
	inGame: true,
	spacebarTooltipShown: false,
	version: 1,
	versionAvailable: null
};

test('game roll request schema rejects null payloads', () => {
	const result = gameRollRequestSchema.safeParse(null);
	assert.equal(result.success, false);
});

test('game roll request schema accepts actor payload', () => {
	const result = gameRollRequestSchema.safeParse({ actorId: 'p1' });
	assert.equal(result.success, true);
});

test('game state update schema rejects malformed updates', () => {
	const result = gameStateUpdateSchema.safeParse({ actorId: 'p1', state: null });
	assert.equal(result.success, false);
});

test('game state update schema accepts valid state updates', () => {
	const result = gameStateUpdateSchema.safeParse({ actorId: 'p1', state: validState });
	assert.equal(result.success, true);
});
