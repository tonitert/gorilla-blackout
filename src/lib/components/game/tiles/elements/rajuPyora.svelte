<script lang="ts">
    import { type ElementProps } from "./elementProps";
    import { getRandomInt } from "$lib/helpers/wait";
	import { onMount } from "svelte";
    const {
		players
	 }: ElementProps = $props();
    let startAnimationPlaying = $state(false);

    onMount(async () => {
        if (startAnimationPlaying) {
            return;
        } else {
            startAnimationPlaying = true;
        }
    })

    function onVideoEnd() {
        startAnimationPlaying = false;
    }


</script>
 {#if startAnimationPlaying}
    <div class="bg-black w-full h-full absolute">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video controls={false} class="w-full" autoplay onended={onVideoEnd}>
            <source src="video/rajupyora.mp4"/>
        </video>
    </div>
{/if}
<div class="absolute m-auto w-80%">
    
    <div class="">

    </div>
   
    
</div>