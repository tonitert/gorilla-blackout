<script lang="ts">
	import Dice from "$lib/components/ui/dice/Dice.svelte";
	import type { ElementPropsTile } from "./elementProps";

    let stage = $state<"waitingForRoll" | "rolling">("waitingForRoll");
    
    const {
        movePlayer,
        currentPlayerIndex,
        setActionButtonText
    }: ElementPropsTile = $props();

    setActionButtonText?.("Heitä noppaa");
    
    export function onActionButtonClick() {
        if (stage === "waitingForRoll") {
            stage = "rolling";
            setActionButtonText?.("Pyöritetään..");
        }
    }

</script>

{#if stage === "rolling"}
<Dice 
    result={(results) => {
        if (results.reduce((partialSum, a) => partialSum + a, 0) > 10) {
            movePlayer(-35, currentPlayerIndex);
        } else {
            movePlayer(1, currentPlayerIndex);
        }
        setActionButtonText?.(null);
    }}
    count={2}
    changesBeforeSettle={30}
/>
{/if}