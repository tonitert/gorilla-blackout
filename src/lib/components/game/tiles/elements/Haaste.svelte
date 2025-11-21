<script lang="ts">
	import { ElementPropsTile, type ElementProps } from './elementProps';
	import { getRandomIntExcluding } from '$lib/helpers/wait';
	const { players, currentPlayerIndex }: ElementPropsTile = $props();
</script>

<p class="text-center text-xl">
	Pelaaja {players[getRandomIntExcluding(0, players.length, currentPlayerIndex)].name} keksii sinulle
	haasteen! Jos et tee haastetta, juo 10 huikkaa.
</p>
