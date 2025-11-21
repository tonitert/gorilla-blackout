<script lang="ts">
	import { GameMode } from '$lib/multiplayer/types';
	import Button from '../ui/button/button.svelte';

	let {
		onSelect
	}: {
		onSelect: (mode: GameMode) => void;
	} = $props();
</script>

<div class="space-y-6">
	<h2 class="text-xl">Valitse pelitila</h2>
	
	<div class="grid gap-4 sm:grid-cols-2">
		<button
			class="flex flex-col items-center justify-center space-y-3 rounded-xl border-2 border-gray-600 p-6 transition-all hover:border-blue-500 hover:bg-blue-500/10"
			onclick={() => onSelect(GameMode.SINGLE_DEVICE)}
		>
			<div class="text-5xl">📱</div>
			<h3 class="text-lg font-semibold">Yksi laite</h3>
			<p class="text-center text-sm text-gray-400">
				Perinteinen tapa pelata - kaikki pelaajat käyttävät samaa laitetta
			</p>
		</button>

		<button
			class="flex flex-col items-center justify-center space-y-3 rounded-xl border-2 border-gray-600 p-6 transition-all hover:border-blue-500 hover:bg-blue-500/10"
			onclick={() => onSelect(GameMode.MULTI_DEVICE)}
		>
			<div class="text-5xl">🌐</div>
			<h3 class="text-lg font-semibold">Monta laitetta</h3>
			<p class="text-center text-sm text-gray-400">
				Jokainen pelaaja voi käyttää omaa laitettaan - liity peliin koodilla
			</p>
		</button>
	</div>
</div>
