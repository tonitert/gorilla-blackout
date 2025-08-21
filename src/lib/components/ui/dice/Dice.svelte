<script lang="ts">
	import { onMount } from "svelte";
    import { wait, getRandomInt } from "$lib/helpers/wait"

    import dice1 from "$lib/assets/dice/1.svg";
    import dice2 from "$lib/assets/dice/2.svg";
    import dice3 from "$lib/assets/dice/3.svg";
    import dice4 from "$lib/assets/dice/4.svg";
    import dice5 from "$lib/assets/dice/5.svg";
    import dice6 from "$lib/assets/dice/6.svg";

    const {
		count: dieCount = 1,
        result = () => {},
        timeBetweenChanges = 70,
        changesBeforeSettle = 9,
        finalWaitTime = 2000,
        riggedResult
	 }: {
		count?: number
        result?: (results: number[]) => void
        timeBetweenChanges?: number
        changesBeforeSettle?: number
        finalWaitTime?: number
        riggedResult?: number[]
	} = $props();

    const diceSizePercentage = 40;
    const images = [dice1, dice2, dice3, dice4, dice5, dice6];
    let diceNumbers = $state(Array(dieCount).fill(0));
    let rolling = false;

    onMount(async () => {
        if (rolling) {
            return;
        } else {
            rolling = true;
        }
        diceNumbers = Array(dieCount).fill(0);
        for (let i = 0; i < changesBeforeSettle; i++) {
            await wait(timeBetweenChanges);
            diceNumbers = diceNumbers.map(() => 
                getRandomInt(0,6)
            )
        }
        await wait(finalWaitTime);
        if (riggedResult) {
            result(riggedResult);
        } else {
            result(diceNumbers.map((num) => num + 1));
        }
    })
</script>

<div class="w-full h-full flex flex-wrap justify-center items-center gap-2">
    {#each images as img}
		<link rel="preload" as="image" href="{img}">
	{/each}
    {#each diceNumbers as num}
		<img 
            class="dice aspect-square" 
            alt="Die with number {num + 1}" 
            src="{images[num]}"
            style="width: {diceSizePercentage / diceNumbers.length}%;"
        />
	{/each}
</div>