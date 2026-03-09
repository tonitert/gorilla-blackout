type RunDiceAnimationOptions = {
	dieCount: number;
	timeBetweenChanges: number;
	changesBeforeSettle: number;
	finalWaitTime: number;
	riggedResult?: number[];
	wait: (ms: number) => Promise<void>;
	getRandomInt: (min: number, max: number) => number;
	onFrame: (diceNumbers: number[]) => void;
	onResult: (results: number[]) => void;
	shouldContinue?: () => boolean;
};

const riggedResultDisplayTime = 1000;
const standardResultDisplayTime = 800;

function clampDieFace(value: number): number {
	return Math.min(6, Math.max(1, value));
}

export async function runDiceAnimation({
	dieCount,
	timeBetweenChanges,
	changesBeforeSettle,
	finalWaitTime,
	riggedResult,
	wait,
	getRandomInt,
	onFrame,
	onResult,
	shouldContinue = () => true
}: RunDiceAnimationOptions): Promise<void> {
	let diceNumbers = Array(dieCount).fill(0);
	onFrame(diceNumbers);
	if (!shouldContinue()) return;

	for (let i = 0; i < changesBeforeSettle; i++) {
		await wait(timeBetweenChanges);
		if (!shouldContinue()) return;
		diceNumbers = diceNumbers.map(() => getRandomInt(0, 6));
		onFrame(diceNumbers);
	}

	const settledResults = riggedResult ?? diceNumbers.map((num) => num + 1);
	if (!riggedResult) {
		await wait(finalWaitTime);
		if (!shouldContinue()) return;
	}

	onFrame(settledResults.map((num) => clampDieFace(num) - 1));
	await wait(riggedResult ? riggedResultDisplayTime : standardResultDisplayTime);
	if (!shouldContinue()) return;
	onResult(settledResults.map(clampDieFace));
}
