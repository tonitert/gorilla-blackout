export type SpinnerStage =
	| 'starting'
	| 'waitingForAnimation'
	| 'animationPlaying'
	| 'waitingForSpin'
	| 'spinning'
	| 'result';

export type DiceTileStage = 'waitingForRoll' | 'rolling';

export function getSpinnerButtonText(stage: SpinnerStage): string | null {
	if (stage === 'waitingForSpin') {
		return 'Pyöräytä pyörää';
	}

	if (stage === 'result') {
		return null;
	}

	return 'Odota..';
}

export function getDiceTileButtonText(stage: DiceTileStage): string {
	return stage === 'waitingForRoll' ? 'Heitä noppaa' : 'Pyöritetään..';
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
