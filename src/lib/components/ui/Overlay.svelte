<script lang="ts">
	import type { Component } from 'svelte';
	import { fade } from 'svelte/transition';

	let {
		addedElementInstance = $bindable(),
		...props
	}: {
		AddedElement?: Component<any, { onActionButtonClick?: () => void }>;
		customElementProps?: Record<string, any>;
		message?: string;
		addedElementInstance?: { onActionButtonClick?: () => void };
	} = $props();
	const { AddedElement, customElementProps, message } = props;
</script>

<div
	in:fade={{ duration: 1800 }}
	class="backdrop flex h-full w-full flex-col items-center justify-center bg-black/60"
>
	{#if message && message.length > 0}
		<p class="mt-5 text-2xl text-white">{message}</p>
	{/if}
	{#if AddedElement}
		<AddedElement {...customElementProps} bind:this={addedElementInstance} />
	{/if}
</div>
