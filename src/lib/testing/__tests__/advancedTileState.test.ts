import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	areDiceRollsEqual,
	getDiceTileButtonText,
	getSpinnerLayerVisibility,
	normalizeDiceRolls,
	getSpinResult,
	getSpinnerButtonText,
	isValidTargetIndex
} from '../../components/game/tiles/elements/advancedTileState';

describe('advancedTileState', () => {
	it('maps spinner stages to the correct button labels', () => {
		assert.equal(getSpinnerButtonText('waitingForSpin'), 'Pyöräytä pyörää');
		assert.equal(getSpinnerButtonText('result'), null);
		assert.equal(getSpinnerButtonText('animationPlaying'), 'Odota..');
	});

	it('shows the correct spinner layers for intro, wheel, and result stages', () => {
		assert.deepEqual(getSpinnerLayerVisibility('waitingForAnimation', true), {
			showIntro: true,
			showWheel: false,
			showResult: false
		});
		assert.deepEqual(getSpinnerLayerVisibility('animationPlaying', true), {
			showIntro: true,
			showWheel: false,
			showResult: false
		});
		assert.deepEqual(getSpinnerLayerVisibility('waitingForSpin', true), {
			showIntro: false,
			showWheel: true,
			showResult: false
		});
		assert.deepEqual(getSpinnerLayerVisibility('result', true), {
			showIntro: false,
			showWheel: true,
			showResult: true
		});
		assert.deepEqual(getSpinnerLayerVisibility('waitingForAnimation', false), {
			showIntro: false,
			showWheel: false,
			showResult: false
		});
	});

	it('maps dice tile stages to the correct button labels', () => {
		assert.equal(getDiceTileButtonText('waitingForRoll'), 'Heitä noppaa');
		assert.equal(getDiceTileButtonText('rolling'), 'Pyöritetään..');
		assert.equal(getDiceTileButtonText('resolved'), null);
	});

	it('clamps spin results to the wheel and returns the matching rotation', () => {
		const result = getSpinResult(12, 12, 6);

		assert.equal(result.chosen, 11);
		assert.equal(result.spinFloat < 12, true);
		assert.equal(result.spinDegrees > 2160, true);
	});

	it('validates synced target indices against the current player', () => {
		assert.equal(isValidTargetIndex(4, 1, 2), true);
		assert.equal(isValidTargetIndex(4, 1, 1), false);
		assert.equal(isValidTargetIndex(4, 1, 5), false);
		assert.equal(isValidTargetIndex(1, 0, 0), false);
	});

	it('normalizes dice rolls and compares them safely', () => {
		assert.deepEqual(normalizeDiceRolls([1, '6'], 2), [1, 6]);
		assert.equal(normalizeDiceRolls([0], 1), null);
		assert.equal(areDiceRollsEqual([2, 4], [2, 4]), true);
		assert.equal(areDiceRollsEqual([2, 4], [2, 5]), false);
	});
});
