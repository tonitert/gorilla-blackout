<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initLocale } from '$lib/i18n/locale.svelte';
	import LanguageSwitcher from '$lib/components/ui/LanguageSwitcher.svelte';

	let { children } = $props();

	onMount(() => {
		initLocale();
	});
</script>

<div class="app">
	<LanguageSwitcher />
	<main>
		{@render children()}
	</main>
</div>
