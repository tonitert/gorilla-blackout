<script lang="ts">
	import { onMount } from "svelte";
    import { wait, getRandomInt } from "$lib/helpers/wait"

    const {
		count: dieCount = 1,
        result = () => {},
        timeBetweenChanges = 70,
        changesBeforeSettle = 9,
        finalWaitTime = 1200
	 }: {
		count?: number
        result?: (results: number[]) => void
        timeBetweenChanges?: number
        changesBeforeSettle?: number
        finalWaitTime?: number
	} = $props();

    const dieSize = "100px";
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
        result(diceNumbers.map((num) => num + 1))
    })
</script>

<div>
    {#each images as img}
		<link rel="preload" as="image" href="/dice/{img}">
	{/each}
    {#each diceNumbers as num}
		<img 
            class="dice aspect-square" 
            alt="Die with number {num + 1}" 
            src="/dice/{images[num]}"
            style="width: {dieSize};"
        />
	{/each}
</div>