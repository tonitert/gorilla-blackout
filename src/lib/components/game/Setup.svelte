<script lang="ts">
	import { clearGameState, gameStateStore, type GameState } from "$lib/gameState.svelte";
	import Button from "../ui/button/button.svelte";
    import logo from "$lib/assets/logo.webp";
	import PlayerSelector from "./PlayerSelector.svelte";
    import type { PlayerList } from "./PlayerSelector.svelte";
	import { Skeleton } from "../ui/skeleton";

    let {
        onStart,
        pendingState
    }: {
        onStart: (players: PlayerList) => void,
        pendingState: GameState | "loading" | undefined
    } = $props();

</script>

<div class="p-5 space-y-6 max-w-200 flex flex-col m-auto">
    <h1>
        <img src={logo} alt="Gorilla Blackout - rankka juomapeli opiskelijoille!"/>
    </h1>
    
    <p class="text-lg">
        Tervetuloa Gorilla Blackoutiin, kahden opiskelijan kehittämään äärimmäisen rajuun juomapeliin! Nopilla pelattavana lautapelinä luonnollisesti tavoitteena on päästä maaliin suorittaen tehtäviä laudalla, 
        mutta se on helpommin sanottu kuin tehty - ja peli on sitä rankempi, mitä enemmän pelaajia on mukana! 
        <br/><br/>
        Pelissä juodaan paljon sekä mietoja että vahvoja, joten suosittelemme pelaajia varustautumaan varsin runsaasti. Onnea matkaan!
    </p>

    {#if pendingState === "loading"}
        <Skeleton class="rounded-xl shadow-grey ring-gray-600 ring mt-10 w-full h-[300px]" />
    {:else if pendingState && pendingState.inGame}
        <div class="pending-game p-3 rounded-xl shadow-grey ring-gray-600 ring shadow-2xl/30 mt-10 flex gap-2 flex-col">
			<h2 class="text-xl">Aikaisempi peli löytyi. Haluatko jatkaa?</h2>
			<p>Pelaajat:</p>
			<ul>
				{#each pendingState.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
			<Button onclick={() => {
                gameStateStore.set(pendingState);
            }}>Jatka peliä</Button>
		</div>
    {/if}
    
    <h2 class="text-xl">Aloita peli</h2>

    <PlayerSelector
        onSubmit={onStart}>
    </PlayerSelector>

</div>
<footer class="text-center p-5 text-sm text-gray-500">
  <p>Gorilla Blackout on täysin ilmainen juomapeli, ja se on aina pelattavissa suomeksi netissä osoitteessa blackout.beer.</p>
  <p>Ota yhteyttä kehittäjiin: <a class="underline" href="mailto:contact@blackout.beer">contact@blackout.beer</a></p>
</footer>
