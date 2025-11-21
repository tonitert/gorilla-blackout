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
		riggedRandom?: number = 0;
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
		riggedRandom = undefined
	}: SpinnerProps = $props();

	const waitBeforeAnimation = 2000;
	let stage = $state<
		| 'starting'
		| 'waitingForAnimation'
		| 'animationPlaying'
		| 'waitingForSpin'
		| 'spinning'
		| 'result'
	>('starting');
	let paused = $derived(stage !== 'animationPlaying');
	let video: HTMLVideoElement | null = $state(null);
	let spinDegrees = $state(0);
	let chosen = $state(0);
	let addedElementInstance = $state<{ onActionButtonClick?: () => void } | undefined>(undefined);

	onMount(async () => {
		setActionButtonText?.('Odota..');
		if (stage !== 'starting') {
			return;
		}
		// getRandomNumber should produce a float in [0, wheelOptions)
		let spinFloat = riggedRandom !== undefined ? riggedRandom : getRandomNumber(0, wheelOptions);
		// guard against rare case of returning the exact max
		if (spinFloat >= wheelOptions) spinFloat = wheelOptions - Number.EPSILON;

		// chosen index is the integer segment
		chosen = Math.floor(spinFloat);

		// compute degrees from fractional position around the wheel
		const fraction = spinFloat / wheelOptions;
		spinDegrees = 360 * spinsBeforeStop + fraction * 360;

		if (!animation) {
			stage = 'waitingForSpin';
			setActionButtonText?.('Pyöräytä pyörää');
		} else {
			stage = 'waitingForAnimation';
			await wait(waitBeforeAnimation);
			stage = 'animationPlaying';
		}
	});

	const wheelOptions = options.length;

	export function onActionButtonClick() {
		if (stage === 'waitingForSpin') {
			stage = 'spinning';
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
				stage = 'waitingForSpin';
				setActionButtonText?.('Pyöräytä pyörää');
			}}
			onerror={() => {
				stage = 'waitingForSpin';
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
			if (stage === 'animationPlaying') {
				stage = 'waitingForSpin';
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
				stage = 'result';
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
			customElementProps={options[chosen].props}
			bind:addedElementInstance
		/>
	</div>
{/if}
