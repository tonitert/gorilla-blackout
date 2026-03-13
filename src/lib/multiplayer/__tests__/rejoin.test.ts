import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRejoinCode } from '../rejoin';

describe('multiplayer rejoin helpers', () => {
	it('normalizes stored codes', () => {
		assert.equal(parseRejoinCode('abc123'), 'ABC123');
	});

	it('returns null for invalid values', () => {
		assert.equal(parseRejoinCode('abc'), null);
		assert.equal(parseRejoinCode(123), null);
		assert.equal(parseRejoinCode(undefined), null);
	});
});
