import assert from 'node:assert/strict';
import test from 'node:test';
import { getResumeAvailabilityRefreshDelayMs } from '../setupResume';
import type { MultiplayerResumeAvailability } from '$lib/multiplayer/client';

const unavailableWithoutSession: MultiplayerResumeAvailability = {
	status: 'unavailable',
	session: null,
	lobby: null
};

const unavailableWithSession: MultiplayerResumeAvailability = {
	status: 'unavailable',
	session: {
		code: 'ABCD',
		playerId: 'player-1'
	},
	lobby: null
};

test('returns immediate refresh for first lookup', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 0,
		loadingMultiplayerResume: false,
		multiplayerResumeAvailability: unavailableWithoutSession
	});

	assert.equal(delay, 0);
});

test('retries once when first lookup has no resumable session', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 1,
		loadingMultiplayerResume: false,
		multiplayerResumeAvailability: unavailableWithoutSession
	});

	assert.equal(delay, 3000);
});

test('stops refreshing after second missing-session result', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 2,
		loadingMultiplayerResume: false,
		multiplayerResumeAvailability: unavailableWithoutSession
	});

	assert.equal(delay, null);
});

test('retries after transient unavailable when session exists', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 1,
		loadingMultiplayerResume: false,
		multiplayerResumeAvailability: unavailableWithSession
	});

	assert.equal(delay, 3000);
});

test('does not refresh when lookup is already loading', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 0,
		loadingMultiplayerResume: true,
		multiplayerResumeAvailability: unavailableWithSession
	});

	assert.equal(delay, null);
});
