<script lang="ts">
	import type { Component } from "svelte";
	import { fade } from "svelte/transition";

    let {
        addedElementInstance = $bindable(),
        ...props
    }: {
        AddedElement?: Component<any, {onActionButtonClick?: () => void}>;
        customElementProps?: Record<string, any>
        message?: string
        addedElementInstance?: {onActionButtonClick?: () => void}
    } = $props();
    const {
        AddedElement,
        customElementProps,
        message,
    } = props;
</script>

<div in:fade={{duration: 1800}} class="backdrop bg-black/60 w-full h-full flex flex-col items-center justify-center">
	{#if message}
        <p class="text-white text-2xl mt-5">{message}</p>
    {/if}
	{#if AddedElement}
		<AddedElement {...customElementProps} bind:this={addedElementInstance}/>
	{/if}
</div>