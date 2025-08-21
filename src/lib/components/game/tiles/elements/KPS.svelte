<script lang="ts">
    import { ElementPropsTile } from "./elementProps";
    import { getRandomIntExcluding } from "$lib/helpers/wait";
    const {
		players,
        currentPlayerIndex
	 }: ElementPropsTile = $props();
</script>

<p class="text-center text-xl">
    Pelaa kivi-paperi-sakset pelaajan {players[getRandomIntExcluding(0, players.length, currentPlayerIndex)].name} kanssa. Häviäjä juo shotin.
</p>