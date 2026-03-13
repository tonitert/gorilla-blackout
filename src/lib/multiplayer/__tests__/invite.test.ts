import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildJoinGameUrl, getJoinCodeFromSearch } from '../invite';

describe('multiplayer invite helpers', () => {
	it('reads a valid join code from the query string', () => {
		assert.equal(getJoinCodeFromSearch('?join=abc123'), 'ABC123');
		assert.equal(getJoinCodeFromSearch('?foo=bar&join=z9y8x7'), 'Z9Y8X7');
	});

	it('ignores invalid join codes', () => {
		assert.equal(getJoinCodeFromSearch('?join=abc'), null);
		assert.equal(getJoinCodeFromSearch('?join=toolong7'), null);
	});

	it('builds an absolute invite url with a normalized join code', () => {
		assert.equal(
			buildJoinGameUrl('abc123', 'https://blackout.beer'),
			'https://blackout.beer/?join=ABC123'
		);
	});
});
