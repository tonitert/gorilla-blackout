<script lang="ts">
	import { onMount } from 'svelte';
	import { clearGameState } from '$lib/gameState.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<p class="text-center text-xl">{m.tile_win()}</p>
