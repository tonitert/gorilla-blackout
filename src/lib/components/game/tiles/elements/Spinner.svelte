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
	import { getSpinnerButtonText, getSpinResult, type SpinnerStage } from './advancedTileState';
	import { playSpinnerIntroWithSound } from './spinnerVideo';

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
	const introFallbackMs = 20000;
	let stage = $state<SpinnerStage>('starting');
	let video: HTMLVideoElement | null = $state(null);
	let spinDegrees = $state(0);
	let chosen = $state(0);
	let selectedSpinFloat = $state<number | null>(null);
	let addedElementInstance = $state<{ onActionButtonClick?: () => void } | undefined>(undefined);
	let videoPlaybackFailed = $state(false);

	const wheelOptions = options.length;

	function setStage(nextStage: SpinnerStage, options: { broadcast?: boolean } = {}) {
		const { broadcast = canAct } = options;

		stage = nextStage;
		setActionButtonText?.(getSpinnerButtonText(nextStage));

		if (broadcast) {
			setTileState?.((prev) =>
				prev[stageKey] === nextStage ? prev : { ...prev, [stageKey]: nextStage }
			);
		}
	}

	function setSpinResult(spinFloat: number, options: { broadcast?: boolean } = {}) {
		const { broadcast = canAct } = options;
		const result = getSpinResult(spinFloat, wheelOptions, spinsBeforeStop);

		selectedSpinFloat = result.spinFloat;
		chosen = result.chosen;
		spinDegrees = result.spinDegrees;

		if (broadcast) {
			setTileState?.((prev) =>
				prev[resultKey] === result.spinFloat ? prev : { ...prev, [resultKey]: result.spinFloat }
			);
		}
	}

	function completeIntro() {
		if (!canAct) return;
		if (stage !== 'waitingForAnimation' && stage !== 'animationPlaying') return;
		setStage('waitingForSpin');
	}

	onMount(() => {
		let cancelled = false;

		if (!canAct) {
			setActionButtonText?.(getSpinnerButtonText(stage));
			return;
		}

		const initialize = async () => {
			const remoteResult = tileState?.[resultKey];
			const remoteStage = tileState?.[stageKey];

			if (typeof remoteResult === 'number') {
				setSpinResult(remoteResult, { broadcast: false });
			} else {
				setSpinResult(riggedRandom !== undefined ? riggedRandom : getRandomNumber(0, wheelOptions));
			}

			if (typeof remoteStage === 'string') {
				setStage(remoteStage as SpinnerStage, { broadcast: false });
				return;
			}

			if (!animation) {
				setStage('waitingForSpin');
				return;
			}

			setStage('waitingForAnimation');
			await wait(waitBeforeAnimation);

			if (cancelled) return;

			setStage('animationPlaying');
		};

		void initialize();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const remoteResult = tileState?.[resultKey];

		if (typeof remoteResult === 'number' && remoteResult !== selectedSpinFloat) {
			setSpinResult(remoteResult, { broadcast: false });
		}
	});

	$effect(() => {
		const remoteStage = tileState?.[stageKey];

		if (typeof remoteStage === 'string' && remoteStage !== stage) {
			setStage(remoteStage as SpinnerStage, { broadcast: false });
		}
	});

	$effect(() => {
		if (stage !== 'animationPlaying') {
			videoPlaybackFailed = false;
			return;
		}

		let cancelled = false;
		const currentVideo = video;
		const timeoutId = setTimeout(() => {
			if (!cancelled) {
				completeIntro();
			}
		}, introFallbackMs);

		videoPlaybackFailed = false;

		if (currentVideo) {
			currentVideo.currentTime = 0;
			void playSpinnerIntroWithSound(currentVideo).then((played) => {
				if (cancelled || played) return;
				videoPlaybackFailed = true;
				completeIntro();
			});
		}

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
			currentVideo?.pause();
		};
	});

	export function onActionButtonClick() {
		if (!canAct) return;
		if (stage === 'waitingForSpin') {
			setStage('spinning');
		}
		addedElementInstance?.onActionButtonClick?.();
	}
</script>

{#if animation}
	<link rel="preload" as="video" href={animationUrl} type="video/mp4" />
{/if}

{#if (stage === 'waitingForAnimation' || stage === 'animationPlaying') && animation}
	<div
		class="absolute h-full w-full bg-neutral-950 bg-contain bg-center bg-no-repeat"
		style="background-image: url({spinnerImage});"
	>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			playsInline
			preload="auto"
			controls={false}
			poster={spinnerImage}
			bind:this={video}
			class="h-full w-full object-contain"
			onended={() => {
				completeIntro();
			}}
			onerror={() => {
				videoPlaybackFailed = true;
				completeIntro();
			}}
		>
			<source src={animationUrl} type="video/mp4" />
		</video>
		{#if videoPlaybackFailed}
			<div class="absolute inset-0 flex items-center justify-center bg-black/45">
				<p class="rounded bg-black/70 px-4 py-2 text-center text-white">Pyörää valmistellaan...</p>
			</div>
		{/if}
	</div>
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
				if (!canAct || stage !== 'spinning') return;
				setStage('result');
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
