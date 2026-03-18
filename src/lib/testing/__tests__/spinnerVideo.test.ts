import test from 'node:test';
import assert from 'node:assert/strict';

import { playSpinnerIntroWithSound } from '$lib/components/game/tiles/elements/spinnerVideo';

function createVideoMock({
	readyState = 2,
	playImpl,
	loadImpl
}: {
	readyState?: number;
	playImpl?: () => Promise<void>;
	loadImpl?: () => void;
} = {}) {
	const listeners = new Map<string, Set<() => void>>();

	return {
		video: {
			muted: true,
			volume: 0,
			currentTime: 7,
			readyState,
			play: playImpl ?? (async () => {}),
			load: loadImpl ?? (() => {}),
			addEventListener: (type: string, listener: () => void) => {
				const handlers = listeners.get(type) ?? new Set<() => void>();
				handlers.add(listener);
				listeners.set(type, handlers);
			},
			removeEventListener: (type: string, listener: () => void) => {
				listeners.get(type)?.delete(listener);
			}
		},
		dispatch(type: string) {
			for (const listener of listeners.get(type) ?? []) {
				listener();
			}
		}
	};
}

test('playSpinnerIntroWithSound unmutes and returns true when playback starts immediately', async () => {
	const calls: string[] = [];
	const { video } = createVideoMock({
		playImpl: async () => {
			calls.push('play');
		}
	});

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, true);
	assert.equal(video.muted, false);
	assert.equal(video.volume, 1);
	assert.equal(video.currentTime, 0);
	assert.deepEqual(calls, ['play']);
});

test('playSpinnerIntroWithSound waits for video data before starting playback', async () => {
	const calls: string[] = [];
	const { video, dispatch } = createVideoMock({
		readyState: 0,
		loadImpl: () => {
			video.readyState = 2;
			queueMicrotask(() => {
				dispatch('loadeddata');
			});
		},
		playImpl: async () => {
			calls.push('play');
		}
	});

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, true);
	assert.equal(video.currentTime, 0);
	assert.deepEqual(calls, ['play']);
});

test('playSpinnerIntroWithSound returns false when autoplay is blocked', async () => {
	const { video } = createVideoMock({
		playImpl: async () => {
			throw new Error('NotAllowedError');
		}
	});

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, false);
	assert.equal(video.muted, false);
	assert.equal(video.volume, 1);
	assert.equal(video.currentTime, 0);
});

test('playSpinnerIntroWithSound returns false when loading fails', async () => {
	const { video, dispatch } = createVideoMock({
		readyState: 0,
		loadImpl: () => {
			queueMicrotask(() => {
				dispatch('error');
			});
		}
	});

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, false);
	assert.equal(video.currentTime, 0);
});
