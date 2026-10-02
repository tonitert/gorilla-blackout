<script lang="ts">
	import { gameStateStore, type GameState } from '$lib/gameState.svelte';
	import Button from '../ui/button/button.svelte';
	import logo from '$lib/assets/logo.webp';
	import PlayerSelector from './PlayerSelector.svelte';
	import type { PlayerList } from './PlayerSelector.svelte';
	import { Skeleton } from '../ui/skeleton';
	import Announcements from './Announcements.svelte';
	import MultiplayerSetup from './MultiplayerSetup.svelte';
	import {
		getMultiplayerResumeAvailability,
		multiplayerStore,
		rejoinMultiplayerGame,
		setMode,
		type MultiplayerResumeAvailability
	} from '$lib/multiplayer/client';
	import { getJoinCodeFromSearch } from '$lib/multiplayer/invite';
	import { getResumeAvailabilityRefreshDelayMs } from './setupResume';
	import { m } from '$lib/paraglide/messages';

	let {
		onStart,
		pendingState
	}: {
		onStart: (players: PlayerList) => void;
		pendingState: GameState | 'loading' | undefined;
	} = $props();

	let appliedJoinCode = $state(false);
	let multiplayerResumeAvailability = $state<MultiplayerResumeAvailability>({
		status: 'unavailable',
		session: null,
		lobby: null
	});
	let loadingMultiplayerResume = $state(false);
	let rejoiningMultiplayer = $state(false);
	let multiplayerResumeError = $state<(() => string) | null>(null);
	let resumeAvailabilityCheckCount = $state(0);

	$effect(() => {
		if (appliedJoinCode || typeof window === 'undefined' || $multiplayerStore.lobby) {
			return;
		}

		const joinCode = getJoinCodeFromSearch(window.location.search);
		if (!joinCode) {
			appliedJoinCode = true;
			return;
		}

		appliedJoinCode = true;
		setMode('multi');
	});

	$effect(() => {
		if (typeof window === 'undefined' || pendingState === 'loading' || !pendingState?.inGame) {
			return;
		}

		const refreshDelayMs = getResumeAvailabilityRefreshDelayMs({
			resumeAvailabilityCheckCount,
			loadingMultiplayerResume,
			multiplayerResumeAvailability
		});

		if (refreshDelayMs === null) {
			return;
		}

		const retryTimeout = window.setTimeout(() => {
			void refreshMultiplayerResumeAvailability();
		}, refreshDelayMs);

		return () => {
			window.clearTimeout(retryTimeout);
		};
	});

	async function refreshMultiplayerResumeAvailability() {
		loadingMultiplayerResume = true;

		try {
			const availability = await getMultiplayerResumeAvailability();
			multiplayerResumeAvailability = availability;
		} catch (error) {
			console.error('Failed to refresh multiplayer resume availability:', error);
		} finally {
			resumeAvailabilityCheckCount += 1;
			loadingMultiplayerResume = false;
		}
	}

	async function onRejoinMultiplayer() {
		if (multiplayerResumeAvailability.status !== 'available') {
			return;
		}

		rejoiningMultiplayer = true;
		multiplayerResumeError = null;

		try {
			await rejoinMultiplayerGame(multiplayerResumeAvailability.session);
		} catch {
			multiplayerResumeError = m.setup_rejoin_failed;
			await refreshMultiplayerResumeAvailability();
		} finally {
			rejoiningMultiplayer = false;
		}
	}
</script>

<div class="m-auto flex max-w-200 flex-col space-y-6 p-5 pt-14">
	<h1>
		<img src={logo} alt={m.setup_logo_alt()} />
	</h1>

	<p class="text-lg">
		{m.setup_intro_1()}
		<br /><br />
		{m.setup_intro_2()}
	</p>

	<Announcements />
	{#if pendingState === 'loading'}
		<Skeleton class="shadow-grey mt-10 h-[300px] w-full rounded-xl ring ring-gray-600" />
	{:else if pendingState && pendingState.inGame}
		<div
			class="pending-game shadow-grey mt-10 flex flex-col gap-2 rounded-xl p-3 shadow-2xl/30 ring ring-gray-600"
		>
			<h2 class="text-xl">{m.setup_previous_game_found()}</h2>
			<p>{m.setup_players_label()}</p>
			<ul>
				{#each pendingState.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
			<div class="flex flex-wrap gap-2">
				<Button
					onclick={() => {
						gameStateStore.set(pendingState);
					}}>{m.setup_continue_game()}</Button
				>
				<Button
					data-testid="resume-multiplayer-submit"
					variant="outline"
					disabled={loadingMultiplayerResume ||
						rejoiningMultiplayer ||
						multiplayerResumeAvailability.status !== 'available'}
					onclick={onRejoinMultiplayer}
				>
					{rejoiningMultiplayer ? m.setup_joining() : m.setup_join_multiplayer()}
				</Button>
			</div>
			{#if multiplayerResumeError}
				<p class="text-red-500">{multiplayerResumeError()}</p>
			{/if}
		</div>
	{/if}

	<h2 class="text-xl">{m.setup_start_game_heading()}</h2>

	<div class="mt-4 flex gap-2">
		<Button
			variant={$multiplayerStore.mode === 'single' ? 'default' : 'outline'}
			onclick={() => setMode('single')}>{m.setup_mode_single()}</Button
		>
		<Button
			variant={$multiplayerStore.mode === 'multi' ? 'default' : 'outline'}
			onclick={() => setMode('multi')}>{m.setup_mode_multi()}</Button
		>
	</div>

	{#if $multiplayerStore.mode === 'single'}
		<PlayerSelector onSubmit={onStart}></PlayerSelector>
	{:else}
		<MultiplayerSetup />
	{/if}
</div>
<footer class="p-5 text-center text-sm text-gray-500">
	<p>
		{m.setup_footer_about()}
	</p>
	<p>
		{m.setup_footer_contact()}
		<a class="underline" href="mailto:contact@blackout.beer">contact@blackout.beer</a>
	</p>
</footer>
