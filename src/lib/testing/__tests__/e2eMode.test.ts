import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isE2EMode } from '../e2eMode';

describe('isE2EMode', () => {
	it('returns true only when e2e query param equals 1', () => {
		assert.equal(isE2EMode('?e2e=1'), true);
		assert.equal(isE2EMode('?e2e=true'), false);
		assert.equal(isE2EMode('?foo=bar'), false);
	});
});
