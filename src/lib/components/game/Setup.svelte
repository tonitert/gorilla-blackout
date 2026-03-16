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
	let multiplayerResumeError = $state('');
	let checkedMultiplayerResume = $state(false);

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
			checkedMultiplayerResume,
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
		const availability = await getMultiplayerResumeAvailability();
		multiplayerResumeAvailability = availability;
		checkedMultiplayerResume = availability.status === 'available' || availability.session === null;
		loadingMultiplayerResume = false;
	}

	async function onRejoinMultiplayer() {
		if (multiplayerResumeAvailability.status !== 'available') {
			return;
		}

		rejoiningMultiplayer = true;
		multiplayerResumeError = '';

		try {
			await rejoinMultiplayerGame(multiplayerResumeAvailability.session);
		} catch {
			multiplayerResumeError = 'Moninpeliin liittyminen epäonnistui';
			await refreshMultiplayerResumeAvailability();
		} finally {
			rejoiningMultiplayer = false;
		}
	}
</script>

<div class="m-auto flex max-w-200 flex-col space-y-6 p-5">
	<h1>
		<img src={logo} alt="Gorilla Blackout - rankka juomapeli opiskelijoille!" />
	</h1>

	<p class="text-lg">
		Tervetuloa Gorilla Blackoutiin, kahden opiskelijan kehittämään äärimmäisen rajuun juomapeliin!
		Nopilla pelattavana lautapelinä luonnollisesti tavoitteena on päästä maaliin suorittaen tehtäviä
		laudalla, mutta se on helpommin sanottu kuin tehty - ja peli on sitä rankempi, mitä enemmän
		pelaajia on mukana!
		<br /><br />
		Pelissä juodaan paljon sekä mietoja että vahvoja, joten suosittelemme pelaajia varustautumaan varsin
		runsaasti. Onnea matkaan!
	</p>

	<Announcements />
	{#if pendingState === 'loading'}
		<Skeleton class="shadow-grey mt-10 h-[300px] w-full rounded-xl ring ring-gray-600" />
	{:else if pendingState && pendingState.inGame}
		<div
			class="pending-game shadow-grey mt-10 flex flex-col gap-2 rounded-xl p-3 shadow-2xl/30 ring ring-gray-600"
		>
			<h2 class="text-xl">Aikaisempi peli löytyi. Haluatko jatkaa?</h2>
			<p>Pelaajat:</p>
			<ul>
				{#each pendingState.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
			<div class="flex flex-wrap gap-2">
				<Button
					onclick={() => {
						gameStateStore.set(pendingState);
					}}>Jatka peliä</Button
				>
				<Button
					data-testid="resume-multiplayer-submit"
					variant="outline"
					disabled={loadingMultiplayerResume ||
						rejoiningMultiplayer ||
						multiplayerResumeAvailability.status !== 'available'}
					onclick={onRejoinMultiplayer}
				>
					{rejoiningMultiplayer ? 'Liitytään...' : 'Liity moninpeliin'}
				</Button>
			</div>
			{#if multiplayerResumeError}
				<p class="text-red-500">{multiplayerResumeError}</p>
			{/if}
		</div>
	{/if}

	<h2 class="text-xl">Aloita peli</h2>

	<div class="mt-4 flex gap-2">
		<Button
			variant={$multiplayerStore.mode === 'single' ? 'default' : 'outline'}
			onclick={() => setMode('single')}>Yksi laite</Button
		>
		<Button
			variant={$multiplayerStore.mode === 'multi' ? 'default' : 'outline'}
			onclick={() => setMode('multi')}>Monen laitteen peli (Beta)</Button
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
		Gorilla Blackout on täysin ilmainen opiskelijoille suunnattu juomapeli, ja se on aina
		pelattavissa suomeksi netissä osoitteessa blackout.beer.
	</p>
	<p>
		Ota yhteyttä kehittäjiin: <a class="underline" href="mailto:contact@blackout.beer"
			>contact@blackout.beer</a
		>
	</p>
</footer>
