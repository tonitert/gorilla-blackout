<script lang="ts">
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import { getRandomInt } from '$lib/helpers/wait';
	import type { ElementPropsTile } from './elementProps';
	import {
		areDiceRollsEqual,
		getDiceTileButtonText,
		getRandomDiceRolls,
		normalizeDiceRolls,
		type DiceTileStage
	} from './advancedTileState';

	let stage = $state<DiceTileStage>('waitingForRoll');
	let diceRolls = $state<number[] | null>(null);
	const stageKey = 'dice_stage';
	const rollsKey = 'dice_rolls';
	const diceCount = 2;

	const {
		movePlayer,
		currentPlayerIndex,
		setActionButtonText,
		tileState,
		setTileState,
		canAct = true
	}: ElementPropsTile = $props();

	function syncDiceState(
		nextStage: DiceTileStage,
		nextRolls: number[] | null,
		options: { broadcast?: boolean } = {}
	) {
		const { broadcast = canAct } = options;
		const normalizedNextRolls = nextRolls === null ? null : [...nextRolls];
		stage = nextStage;
		diceRolls = normalizedNextRolls;

		if (broadcast) {
			setTileState?.((prev) =>
				prev[stageKey] === nextStage &&
				areDiceRollsEqual(normalizeDiceRolls(prev[rollsKey], diceCount), normalizedNextRolls)
					? prev
					: { ...prev, [stageKey]: nextStage, [rollsKey]: normalizedNextRolls }
			);
		}
	}

	$effect(() => {
		setActionButtonText?.(getDiceTileButtonText(stage));
	});

	$effect(() => {
		const remoteStage = tileState?.[stageKey];
		const remoteRolls = normalizeDiceRolls(tileState?.[rollsKey], diceCount);

		if (
			typeof remoteStage === 'string' &&
			(remoteStage !== stage || !areDiceRollsEqual(remoteRolls, diceRolls))
		) {
			syncDiceState(remoteStage as DiceTileStage, remoteRolls, { broadcast: false });
		}
	});

	export function onActionButtonClick() {
		if (!canAct) return;
		if (stage === 'waitingForRoll') {
			syncDiceState('rolling', diceRolls ?? getRandomDiceRolls(diceCount, getRandomInt));
		}
	}
</script>

{#if stage === 'rolling'}
	<Dice
		riggedResult={diceRolls ?? undefined}
		result={(results) => {
			if (!canAct) return;
			const resolvedRolls = normalizeDiceRolls(results, diceCount);
			if (!resolvedRolls) return;
			syncDiceState('resolved', resolvedRolls);
			if (
				resolvedRolls.reduce((partialSum: number, dieValue: number) => partialSum + dieValue, 0) >
				10
			) {
				movePlayer(-35, currentPlayerIndex);
			} else {
				movePlayer(1, currentPlayerIndex);
			}
		}}
		count={2}
		changesBeforeSettle={30}
	/>
{/if}
