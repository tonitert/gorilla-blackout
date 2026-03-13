import test from 'node:test';
import assert from 'node:assert/strict';

import { playSpinnerIntroWithSound } from '$lib/components/game/tiles/elements/spinnerVideo';

test('playSpinnerIntroWithSound unmutes and returns true when playback starts', async () => {
	const calls: string[] = [];
	const video = {
		muted: true,
		volume: 0,
		play: async () => {
			calls.push('play');
		}
	};

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, true);
	assert.equal(video.muted, false);
	assert.equal(video.volume, 1);
	assert.deepEqual(calls, ['play']);
});

test('playSpinnerIntroWithSound returns false when autoplay is blocked', async () => {
	const video = {
		muted: true,
		volume: 0,
		play: async () => {
			throw new Error('NotAllowedError');
		}
	};

	const played = await playSpinnerIntroWithSound(video);

	assert.equal(played, false);
	assert.equal(video.muted, false);
	assert.equal(video.volume, 1);
});
