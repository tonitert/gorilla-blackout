<script lang="ts">
    import { type ElementProps } from "./elementProps";
    import { getRandomInt } from "$lib/helpers/wait";
    const {
		players
	 }: ElementProps = $props();
</script>

<p class="">
    Pelaaja {players[getRandomInt(0, players.length)]} keksii sinulle haasteen! Jos et tee haastetta, juo 10 huikkaa.
</p>