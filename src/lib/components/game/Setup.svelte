<script lang="ts" module>
    import { z } from "zod";

    const minPlayers = 2;
    const maxPlayers = 50;
 
    export const formSchema = z.object({
        players: z.array(z.object({
            name: z.string().min(1, "Nimi on pakollinen").max(100, "Nimi voi olla enintään 100 merkkiä pitkä")
        }))
        .min(minPlayers, `Pelaajia tulee olla vähintään ${minPlayers}.`)
        .max(maxPlayers, `Pelaajia voi olla enintään ${maxPlayers}.`)
        .default([{ name: "" }])
    });

    export type PlayerList = {
        name: string
    }[];
</script>

<script lang="ts">
    import { defaults, superForm, superValidate } from "sveltekit-superforms";
    import { zod, zodClient } from "sveltekit-superforms/adapters";
    import * as Form from "$lib/components/ui/form/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
	import { ElementField, FieldErrors, Fieldset, Legend } from "formsnap";
	import { gameStateStore, type GameState } from "$lib/gameState.svelte";
	import Button from "../ui/button/button.svelte";
    import logo from "$lib/assets/logo.webp";

    const {
        onStart,
        players,
        pendingState
    }: {
        onStart: (players: PlayerList) => void,
        players?: PlayerList,
        pendingState: GameState | undefined
    } = $props();

    const zodObject = zod(formSchema)
    
    const form = superForm(defaults(zodObject), {
        validators: zodClient(formSchema),
        SPA: true,
        onUpdate: ({ form: f }) => {
            if (f.valid) {
                onStart(f.data.players);
            }
        },
        dataType: "json"
    });

    const { form: formData, enhance } = form;

    function addPlayer() {
        $formData.players = [...$formData.players, { name: "" }];
    }

    function removePlayerByIndex(index: number) {
        $formData.players = $formData.players.filter((_, i) => i !== index);
    }

    if (players) {
        $formData.players = players;
    }

</script>

<div class="p-5 space-y-6 max-w-150 flex flex-col m-auto">
    <img src={logo} alt="Blackout (Gorilla Edition) Logo" class="m-auto" />

    {#if pendingState}
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
    
    <h2 class="text-xl">Uusi peli</h2>

    <form class="space-y-6 flex flex-col" use:enhance>
        <Fieldset {form} name="players">
            <Legend class="text-lg">Pelaajat</Legend>
            {#each $formData.players as _, i}
                <ElementField {form} name={`players[${i}].name`}>
                    <Form.Control>
                        {#snippet children({ props })}
                            <div class="flex items-end mt-5">
                                <div class="grow-1 mr-2">
                                    <Form.Label class="">Nimi</Form.Label>
                                    <Input class="mt-2" {...props} bind:value={$formData.players[i].name} />
                                </div>
                                <Form.Button type="button" disabled={$formData.players.length === 1} onclick={() => removePlayerByIndex(i)}>
							        Poista
						        </Form.Button>
                            </div>
                        {/snippet}
                    </Form.Control>
                    <FieldErrors class="text-red-500"/>
                </ElementField>
            {/each}
            <FieldErrors class="text-red-500"/>
        </Fieldset>
        <Form.Button type="button" onclick={addPlayer} disabled={$formData.players.length >= maxPlayers}>
            Lisää pelaaja
        </Form.Button>
        <Form.Button>Aloita peli</Form.Button>
    </form>
</div>
