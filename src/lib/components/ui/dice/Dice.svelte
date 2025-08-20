<script lang="ts">
	import { onMount } from "svelte";
    import { wait, getRandomInt } from "$lib/helpers/wait"

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
    const images = ["1.svg", "2.svg", "3.svg", "4.svg", "5.svg", "6.svg"]
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
		<link rel="preload" as="image" href="/dice/{img}">
	{/each}
    {#each diceNumbers as num}
		<img 
            class="dice aspect-square" 
            alt="Die with number {num + 1}" 
            src="/dice/{images[num]}"
            style="width: {diceSizePercentage / diceNumbers.length}%;"
        />
	{/each}
</div>