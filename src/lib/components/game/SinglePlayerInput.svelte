<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import Button from '../ui/button/button.svelte';

	let {
		onSubmit,
		submitText = 'Jatka',
		playerName = $bindable('')
	}: {
		onSubmit: (name: string) => void;
		submitText?: string;
		playerName?: string;
	} = $props();

	let errorMessage = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		if (!playerName.trim()) {
			errorMessage = 'Nimi on pakollinen';
			return;
		}

		if (playerName.trim().length > 100) {
			errorMessage = 'Nimi voi olla enintään 100 merkkiä pitkä';
			return;
		}

		onSubmit(playerName.trim());
	}
</script>

<form class="space-y-4" onsubmit={handleSubmit}>
	<div>
		<label for="player-name" class="mb-2 block text-sm font-medium">Nimesi</label>
		<Input
			id="player-name"
			type="text"
			bind:value={playerName}
			placeholder="Anna nimesi"
			maxlength="100"
			class="mt-2"
		/>
		{#if errorMessage}
			<p class="mt-1 text-sm text-red-500">{errorMessage}</p>
		{/if}
	</div>

	<Button type="submit" class="w-full cursor-pointer">{submitText}</Button>
</form>
