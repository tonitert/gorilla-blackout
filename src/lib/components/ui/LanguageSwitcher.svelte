<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { locales } from '$lib/i18n/locale.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
</script>

<div
	role="group"
	aria-label={m.language_label()}
	data-testid="language-switcher"
	class="fixed top-2 right-2 z-50 flex gap-1 rounded-md bg-black/60 p-1"
>
	{#each locales as locale (locale)}
		<Button
			size="sm"
			variant={getLocale() === locale ? 'default' : 'outline'}
			aria-pressed={getLocale() === locale}
			data-testid={`language-${locale}`}
			onclick={() => setLocale(locale)}
		>
			{locale.toUpperCase()}
		</Button>
	{/each}
</div>
