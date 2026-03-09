<script lang="ts" module>
	import { ElementProps } from './elementProps';
	export class SpinnerOption<T extends Record<string, any>> {
		name?: string;
		element?: Component<T>;
		props?: T;

		constructor(name?: string, element?: Component<T>, props?: T) {
			this.name = name;
			this.element = element;
			this.props = props;
		}
	}

	export class SpinnerProps extends ElementProps {
		animation?: boolean;
		options: SpinnerOption<any>[] = [];
		spinsBeforeStop?: number;
		spinnerImage: string = '';
		animationDuration?: number = 0;
		topOffset?: number = 0;
		riggedRandom?: number = undefined;
		depth?: number = 0;
	}
</script>

<script lang="ts">
	import { getRandomNumber, wait } from '$lib/helpers/wait';
	import { onMount, type Component } from 'svelte';
	import Overlay from '$lib/components/ui/Overlay.svelte';
	import RajuOsoitin from '$lib/assets/RajuOsoitin.png';
	import animationUrl from '$lib/assets/video/rajupyora.mp4';

	const {
		players,
		setActionButtonText,
		options,
		spinsBeforeStop = 6,
		animation = false,
		spinnerImage,
		animationDuration = 15000,
		topOffset = 0,
		riggedRandom = undefined,
		tileState,
		setTileState,
		canAct = true,
		depth = 0
	}: SpinnerProps = $props();

	const stageKey = `spin_${depth}_stage`;
	const resultKey = `spin_${depth}_result`;

	const waitBeforeAnimation = 2000;
	let stage = $state<
		| 'starting'
		| 'waitingForAnimation'
		| 'animationPlaying'
		| 'waitingForSpin'
		| 'spinning'
		| 'result'
	>('starting');
	let video: HTMLVideoElement | null = $state(null);
	let spinDegrees = $state(0);
	let chosen = $state(0);
	let addedElementInstance = $state<{ onActionButtonClick?: () => void } | undefined>(undefined);

	const wheelOptions = options.length;

	function applySpinFloat(spinFloat: number) {
		if (spinFloat >= wheelOptions) spinFloat = wheelOptions - Number.EPSILON;
		chosen = Math.floor(spinFloat);
		const fraction = spinFloat / wheelOptions;
		spinDegrees = 360 * spinsBeforeStop + fraction * 360;
	}

	onMount(async () => {
		if (!canAct) return; // non-acting players are driven by $effect

		setActionButtonText?.('Odota..');
		let spinFloat = riggedRandom !== undefined ? riggedRandom : getRandomNumber(0, wheelOptions);
		if (spinFloat >= wheelOptions) spinFloat = wheelOptions - Number.EPSILON;
		applySpinFloat(spinFloat);

		// Publish the random result so all players spin to the same result
		setTileState?.((prev) => ({ ...prev, [resultKey]: spinFloat }));

		if (!animation) {
			stage = 'waitingForSpin';
			setTileState?.((prev) => ({ ...prev, [stageKey]: 'waitingForSpin' }));
			setActionButtonText?.('Pyöräytä pyörää');
		} else {
			stage = 'waitingForAnimation';
			setTileState?.((prev) => ({ ...prev, [stageKey]: 'waitingForAnimation' }));
			await wait(waitBeforeAnimation);
			stage = 'animationPlaying';
			setTileState?.((prev) => ({ ...prev, [stageKey]: 'animationPlaying' }));
		}
	});

	// Non-acting player: mirror acting player's result and stage from tileState
	$effect(() => {
		if (canAct) return;

		const remoteResult = tileState?.[resultKey];
		const remoteStage = tileState?.[stageKey] as string | undefined;

		if (typeof remoteResult === 'number' && spinDegrees === 0) {
			applySpinFloat(remoteResult);
		}

		if (remoteStage && remoteStage !== stage) {
			stage = remoteStage as typeof stage;
			if (remoteStage === 'waitingForSpin') {
				setActionButtonText?.('Pyöräytä pyörää');
			} else if (remoteStage === 'result') {
				setActionButtonText?.(null);
			} else {
				setActionButtonText?.('Odota..');
			}
		}
	});

	export function onActionButtonClick() {
		if (!canAct) return;
		if (stage === 'waitingForSpin') {
			stage = 'spinning';
			setTileState?.((prev) => ({ ...prev, [stageKey]: 'spinning' }));
		}
		addedElementInstance?.onActionButtonClick?.();
	}
</script>

{#if animation}
	<link rel="preload" as="video" href={animationUrl} type="video/mp4" />
{/if}

{#if (stage === 'waitingForAnimation' || stage === 'animationPlaying') && animation}
	<div class="absolute h-full w-full bg-black">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			playsInline
			controls={false}
			bind:this={video}
			class="w-full"
			onended={() => {
				if (!canAct) return;
				stage = 'waitingForSpin';
				setTileState?.((prev) => ({ ...prev, [stageKey]: 'waitingForSpin' }));
				setActionButtonText?.('Pyöräytä pyörää');
			}}
			onerror={() => {
				if (!canAct) return;
				stage = 'waitingForSpin';
				setTileState?.((prev) => ({ ...prev, [stageKey]: 'waitingForSpin' }));
				setActionButtonText?.('Pyöräytä pyörää');
			}}
		>
			<source src={animationUrl} />
		</video>
	</div>
{/if}

{#if stage === 'animationPlaying'}
	{(() => {
		setTimeout(() => {
			if (stage === 'animationPlaying' && canAct) {
				stage = 'waitingForSpin';
				setTileState?.((prev) => ({ ...prev, [stageKey]: 'waitingForSpin' }));
				setActionButtonText?.('Pyöräytä pyörää');
			}
		}, 30000);
		video?.play();
	})()}
{/if}

{#if stage === 'waitingForSpin' || stage === 'spinning' || stage === 'result'}
	<div class="absolute m-auto h-full w-full overflow-hidden">
		<div
			style="transition-duration: {animationDuration}ms; background-image: url({spinnerImage}); transform: rotate(-{stage ===
				'spinning' || stage === 'result'
				? spinDegrees
				: 0}deg);"
			class="aspect-square h-full w-full bg-contain transition-transform ease-[cubic-bezier(.25,-.01,.07,1)]"
			ontransitionend={() => {
				if (!canAct) return;
				stage = 'result';
				setTileState?.((prev) => ({ ...prev, [stageKey]: 'result' }));
				setActionButtonText?.(null);
			}}
		></div>
		<img
			class="absolute left-1/2 z-1 w-[10%] translate-x-[-50%] object-contain"
			style="top: {topOffset}%"
			src={RajuOsoitin}
			alt="Raju Osoitin"
		/>
	</div>
{/if}

{#if stage === 'result'}
	<div class="absolute z-10 h-full w-full">
		<Overlay
			message={options[chosen].name}
			AddedElement={options[chosen].element}
			customElementProps={{ ...options[chosen].props, tileState, setTileState, canAct }}
			bind:addedElementInstance
		/>
	</div>
{/if}
