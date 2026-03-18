export type SpinnerStage =
	| 'starting'
	| 'waitingForAnimation'
	| 'animationPlaying'
	| 'waitingForSpin'
	| 'spinning'
	| 'result';

export type DiceTileStage = 'waitingForRoll' | 'rolling' | 'resolved';

export function getSpinnerButtonText(stage: SpinnerStage): string | null {
	if (stage === 'waitingForSpin') {
		return 'Pyöräytä pyörää';
	}

	if (stage === 'result') {
		return null;
	}

	return 'Odota..';
}

export function getSpinnerLayerVisibility(stage: SpinnerStage, animationEnabled: boolean) {
	const showIntro =
		animationEnabled && (stage === 'waitingForAnimation' || stage === 'animationPlaying');
	const showWheel = stage === 'waitingForSpin' || stage === 'spinning' || stage === 'result';

	return {
		showIntro,
		showWheel,
		showResult: stage === 'result'
	};
}

export function getDiceTileButtonText(stage: DiceTileStage): string | null {
	if (stage === 'waitingForRoll') {
		return 'Heitä noppaa';
	}

	if (stage === 'rolling') {
		return 'Pyöritetään..';
	}

	return null;
}

export function getSpinResult(spinFloat: number, wheelOptions: number, spinsBeforeStop: number) {
	if (wheelOptions <= 0) {
		throw new Error('Spinner must have at least one option.');
	}

	const maxSpinFloat = wheelOptions - Number.EPSILON * Math.max(1, wheelOptions);
	const clampedSpinFloat = Math.min(maxSpinFloat, Math.max(0, spinFloat));
	const chosen = Math.floor(clampedSpinFloat);
	const fraction = clampedSpinFloat / wheelOptions;

	return {
		spinFloat: clampedSpinFloat,
		chosen,
		spinDegrees: 360 * spinsBeforeStop + fraction * 360
	};
}

export function isValidTargetIndex(
	playerCount: number,
	currentPlayerIndex: number,
	targetIndex: unknown
): targetIndex is number {
	const normalizedTargetIndex = Number(targetIndex);

	return (
		Number.isInteger(targetIndex) &&
		playerCount > 1 &&
		normalizedTargetIndex >= 0 &&
		normalizedTargetIndex < playerCount &&
		normalizedTargetIndex !== currentPlayerIndex
	);
}

export function getRandomDiceRolls(
	count: number,
	getRandomInt: (min: number, max: number) => number
): number[] {
	return Array.from({ length: count }, () => getRandomInt(1, 7));
}

export function normalizeDiceRolls(value: unknown, count: number): number[] | null {
	if (!Array.isArray(value) || value.length !== count) {
		return null;
	}

	const normalizedRolls = value.map((entry) => Number(entry));

	if (normalizedRolls.some((roll) => !Number.isInteger(roll) || roll < 1 || roll > 6)) {
		return null;
	}

	return normalizedRolls;
}

export function areDiceRollsEqual(left: number[] | null, right: number[] | null): boolean {
	if (left === right) {
		return true;
	}

	if (left === null || right === null || left.length !== right.length) {
		return false;
	}

	return left.every((value, index) => value === right[index]);
}
