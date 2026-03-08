import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidLobbyCode, normalizeLobbyCode } from '../lobbyCode';

describe('lobby code helpers', () => {
	it('normalizes code', () => {
		assert.equal(normalizeLobbyCode(' ab12cd '), 'AB12CD');
	});

	it('validates expected format', () => {
		assert.equal(isValidLobbyCode('ab12cd'), true);
		assert.equal(isValidLobbyCode('toolong1'), false);
	});
});
