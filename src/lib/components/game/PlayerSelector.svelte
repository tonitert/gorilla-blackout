<script lang="ts" module>
    import { z } from "zod";

    const minPlayers = 2;
    const maxPlayers = 50;

    const readonlyPlayerImages: [string, ...string[]] = [
        "default",
        // And then merge in the remaining values from `properties`
        ...Object.keys(playerImages)
    ];
    

    export const formSchema = z.object({
        players: z.array(z.object({
            name: z.string().min(1, "Nimi on pakollinen").max(100, "Nimi voi olla enintään 100 merkkiä pitkä"),
            image: z.enum(readonlyPlayerImages),
            id: z.string().optional(),
            position: z.number().optional()
        }))
        .min(minPlayers, `Pelaajia tulee olla vähintään ${minPlayers}.`)
        .max(maxPlayers, `Pelaajia voi olla enintään ${maxPlayers}.`)
        .default([{
            name: "",
            image: "default"
        },
        {
            name: "",
            image: "default"
        }])
    });

    export type PlayerList = Player[];
</script>

<script lang="ts">
    import { defaults, superForm } from "sveltekit-superforms";
    import { zod, zodClient } from "sveltekit-superforms/adapters";
    import * as Form from "$lib/components/ui/form/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
	import { ElementField, FieldErrors, Fieldset, Legend } from "formsnap";
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import { playerImages } from "./playerImages";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import Toggle from "../ui/toggle/toggle.svelte";
	import { SvelteSet } from "svelte/reactivity";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import { Player } from "$lib/player";

    const {
        onSubmit,
        players = [],
        onPlayerRemove = () => {},
        onPlayerAdd,
        submitText = "Aloita peli"
    }: {
        onSubmit: (players: PlayerList) => void,
        players?: PlayerList,
        onPlayerRemove?: (index: number) => void,
        onPlayerAdd?: (player: Player) => Player,
        submitText?: string
    } = $props();


    let selectedImages: SvelteSet<string> = $state(new SvelteSet());

    const zodObject = zod(formSchema)
    
    const form = superForm(defaults(zodObject), {
        validators: zodClient(formSchema),
        SPA: true,
        
        onUpdate: ({ form: f }) => {
            if (f.valid) {
                onSubmit(f.data.players.map((p) => (new Player(
                    p.name, 
                    p.image as keyof typeof playerImages | "default", 
                    p.position ?? undefined,
                    p.id ?? undefined
                ))));
            }
        },
        dataType: "json"
    });

    const { form: formData, enhance } = form;

    function addPlayer() {
        const player = new Player("", "default");
        $formData.players = [...$formData.players, onPlayerAdd ? onPlayerAdd(player) : player];
    }

    function removePlayerByIndex(index: number) {
        $formData.players = $formData.players.filter((_, i) => i !== index);
        onPlayerRemove(index);
    }

    if (players.length > 0) {
        $formData.players = players;
    }
</script>

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
                            <Form.Button type="button" disabled={$formData.players.length <= minPlayers} onclick={() => removePlayerByIndex(i)}>
						        Poista
					        </Form.Button>
                        </div>
                    {/snippet}
                </Form.Control>
                <FieldErrors class="text-red-500"/>
            </ElementField>
            <ElementField {form} name={`players[${i}].image`}>
                <Form.Control>
                    {#snippet children({ props })}
                        <Collapsible.Root class="mt-5">
                            <div class="flex items-center space-x-2">
                                <h4 class="text-sm font-semibold">Valitse pelihahmo</h4>
                                <Collapsible.Trigger
                                    class={buttonVariants({ variant: "ghost", size: "sm", class: "w-9 p-0" })}
                                >
                                    <ChevronsUpDownIcon />
                                    <span class="sr-only">Toggle</span>
                                </Collapsible.Trigger>
                            </div>
                            <Collapsible.Content>
                                <div class="flex flex-wrap gap-2 items-center space-b mt-2 justify-around w-full">
                                    <style>
                                        .toggle:last-child {
                                            margin-right: auto;
                                        }
                                    </style>
                                    <Toggle
                                        class="h-[unset] p-3 flex items-center justify-center"
                                        pressed={$formData.players[i].image === "default"}
                                        onclick={(e) => {
                                            selectedImages.delete($formData.players[i].image);
                                            $formData.players[i].image = "default";
                                            e.preventDefault();
                                        }}
                                    >
                                        <p class="text-center">Ei hahmoa</p>
                                    </Toggle>
                                    {#each Object.entries(playerImages) as [name, image]}
                                        <Toggle
                                            class="h-[unset] p-3 toggle"
                                            disabled={selectedImages.has(name) && $formData.players[i].image !== name}
                                            pressed={$formData.players[i].image === name}
                                            onclick={(e) => {
                                                selectedImages.delete($formData.players[i].image);
                                                $formData.players[i].image = name;
                                                selectedImages.add(name);
                                                e.preventDefault();
                                            }}
                                        >
                                            <img src={image} alt={image} class="w-16 h-16 mr-2" />
                                        </Toggle>
                                    {/each}
                                </div>
                            </Collapsible.Content>
                        </Collapsible.Root>
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
    <Form.Button>{submitText}</Form.Button>
</form>