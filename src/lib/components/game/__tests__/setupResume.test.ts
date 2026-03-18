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

	assert.equal(delay, 1000);
});

test('keeps retrying a missing session for a few refresh cycles', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 2,
		loadingMultiplayerResume: false,
		multiplayerResumeAvailability: unavailableWithoutSession
	});

	assert.equal(delay, 1000);
});

test('stops refreshing after repeated missing-session results', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 5,
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

	assert.equal(delay, 1000);
});

test('does not refresh when lookup is already loading', () => {
	const delay = getResumeAvailabilityRefreshDelayMs({
		resumeAvailabilityCheckCount: 0,
		loadingMultiplayerResume: true,
		multiplayerResumeAvailability: unavailableWithSession
	});

	assert.equal(delay, null);
});
