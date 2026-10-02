<script lang="ts">
	import { type ElementProps } from './elementProps';
	import { type SvelteComponent, type Component } from 'svelte';
	import Text from './text.svelte';
	import Spinner, { SpinnerOption } from './Spinner.svelte';

	import wheel5050 from '$lib/assets/5050.png';
	import wheelImage from '$lib/assets/rajupyora.png';
	import MoveToStart from './raju/MoveToStart.svelte';
	import { m } from '$lib/paraglide/messages';

	const {
		players,
		setActionButtonText,
		movePlayer,
		currentPlayerIndex,
		positions,
		tileState,
		setTileState,
		canAct
	}: ElementProps = $props();

	let spinnerInstance: SvelteComponent | undefined = $state(undefined);

	const options: SpinnerOption<any>[] = [
		{
			name: () => m.wheel_group_shot()
		},
		{
			name: () => m.wheel_drink_and_give10()
		},
		{
			name: () => m.wheel_back_to_start(),
			element: MoveToStart,
			props: {
				movePlayer,
				currentPlayerIndex,
				positions
			}
		},
		// 50/50
		new SpinnerOption(undefined, Spinner, {
			animation: false,
			options: [
				new SpinnerOption(() => m.wheel_take3_shots()),
				new SpinnerOption(() => m.wheel_give3_shots())
			],
			spinsBeforeStop: 6,
			spinnerImage: wheel5050,
			depth: 1,
			setActionButtonText: setActionButtonText
		}),
		{
			name: () => m.wheel_least_drunk_drinks10()
		},
		{
			name: () => m.wheel_drink_card_value()
		},
		{
			name: () => m.wheel_drink5()
		},
		new SpinnerOption(() => m.wheel_super_rule(), Text, {
			text: () => m.wheel_super_rule_text()
		}),
		{
			name: () => m.wheel_give50()
		},
		{
			name: () => m.wheel_empty_drink()
		},
		{
			name: () => m.wheel_drink_and_give10_sips()
		},
		{
			name: () => m.wheel_take_shot()
		}
	];
	const spinsBeforeStop = 6;

	export function onActionButtonClick() {
		spinnerInstance?.onActionButtonClick?.();
	}
</script>

<Spinner
	{options}
	{spinsBeforeStop}
	animation={true}
	spinnerImage={wheelImage}
	animationDuration={15000}
	{players}
	{setActionButtonText}
	{tileState}
	{setTileState}
	{canAct}
	depth={0}
	bind:this={spinnerInstance}
	topOffset={6}
/>
