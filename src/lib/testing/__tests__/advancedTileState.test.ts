import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	getDiceTileButtonText,
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

	it('maps dice tile stages to the correct button labels', () => {
		assert.equal(getDiceTileButtonText('waitingForRoll'), 'Heitä noppaa');
		assert.equal(getDiceTileButtonText('rolling'), 'Pyöritetään..');
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
});
