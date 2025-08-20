<script lang="ts">
	import Dice from "$lib/components/ui/dice/Dice.svelte";
	import type { ElementPropsTile } from "./elementProps";

    let stage = $state<"waitingForRoll" | "rolling">("waitingForRoll");

    interface DiceRollBackProps extends ElementPropsTile {
        multiplier?: number
    };

    const {
        multiplier = 1,
        movePlayer,
        currentPlayerIndex,
        setActionButtonText
    }: DiceRollBackProps = $props();

    setActionButtonText?.("Heitä noppaa");
    
    export function onActionButtonClick() {
        if (stage === "waitingForRoll") {
            stage = "rolling";
            setActionButtonText?.(null);
        }
    }

</script>

{#if stage === "rolling"}
<Dice 
    result={(results) => {
        movePlayer(-results[0] * multiplier, currentPlayerIndex);
    }}
    changesBeforeSettle={30}
/>
{/if}