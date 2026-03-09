import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runDiceAnimation } from '../diceAnimation';

describe('runDiceAnimation', () => {
	it('shows the rigged result immediately after the spin and completes in 1630ms', async () => {
		const waits: number[] = [];
		const frames: number[][] = [];
		let result: number[] | undefined;

		await runDiceAnimation({
			dieCount: 1,
			timeBetweenChanges: 70,
			changesBeforeSettle: 9,
			finalWaitTime: 2000,
			riggedResult: [4],
			wait: async (ms) => {
				waits.push(ms);
			},
			getRandomInt: () => 1,
			onFrame: (diceNumbers) => {
				frames.push([...diceNumbers]);
			},
			onResult: (results) => {
				result = [...results];
			}
		});

		assert.equal(
			waits.reduce((sum, ms) => sum + ms, 0),
			1630
		);
		assert.deepEqual(result, [4]);
		assert.equal(frames.at(-1)?.[0], 3);
		assert.equal(waits.at(-1), 1000);
	});

	it('does not emit a result after cancellation', async () => {
		let resultCalled = false;
		let waitCount = 0;

		await runDiceAnimation({
			dieCount: 1,
			timeBetweenChanges: 70,
			changesBeforeSettle: 9,
			finalWaitTime: 2000,
			riggedResult: [4],
			wait: async () => {
				waitCount += 1;
			},
			getRandomInt: () => 1,
			onFrame: () => {},
			onResult: () => {
				resultCalled = true;
			},
			shouldContinue: () => waitCount < 2
		});

		assert.equal(resultCalled, false);
	});
});
