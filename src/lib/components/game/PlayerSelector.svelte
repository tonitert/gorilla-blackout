<script lang="ts" module>
	import { z } from 'zod';

	const minPlayers = 2;
	const maxPlayers = 50;
	const maxNameLength = 100;

	// Zod messages are created once at module load, so they hold keys that are translated when
	// rendered (see translateError) instead of text in a fixed language.
	const validationErrors = {
		nameRequired: 'name_required',
		nameMax: 'name_max',
		minPlayers: 'min_players',
		maxPlayers: 'max_players'
	} as const;

	const readonlyPlayerImages: [string, ...string[]] = [
		'default',
		// And then merge in the remaining values from `properties`
		...Object.keys(playerImages)
	];

	export const formSchema = z.object({
		players: z
			.array(
				z.object({
					name: z
						.string()
						.min(1, validationErrors.nameRequired)
						.max(maxNameLength, validationErrors.nameMax),
					image: z.enum(readonlyPlayerImages),
					id: z.string().optional(),
					position: z.number().optional()
				})
			)
			.min(minPlayers, validationErrors.minPlayers)
			.max(maxPlayers, validationErrors.maxPlayers)
			.default([
				{
					name: '',
					image: 'default'
				},
				{
					name: '',
					image: 'default'
				}
			])
	});

	export type PlayerList = Player[];
</script>

<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod, zodClient } from 'sveltekit-superforms/adapters';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ElementField, FieldErrors, Fieldset, Legend } from 'formsnap';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { playerImages } from './playerImages';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import Toggle from '../ui/toggle/toggle.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { Player } from '$lib/player';
	import { m } from '$lib/paraglide/messages';

	const {
		onSubmit,
		players = [],
		lockedPlayerIds = [],
		onPlayerRemove = () => {},
		onPlayerAdd,
		submitText,
		compact = false
	}: {
		onSubmit: (players: PlayerList) => void;
		players?: PlayerList;
		lockedPlayerIds?: string[];
		onPlayerRemove?: (index: number) => void;
		onPlayerAdd?: (player: Player) => Player;
		submitText?: string;
		compact?: boolean;
	} = $props();

	let selectedImages: SvelteSet<string> = $state(new SvelteSet());

	function translateError(error: string) {
		switch (error) {
			case validationErrors.nameRequired:
				return m.common_name_required();
			case validationErrors.nameMax:
				return m.selector_name_max({ count: maxNameLength });
			case validationErrors.minPlayers:
				return m.selector_min_players({ count: minPlayers });
			case validationErrors.maxPlayers:
				return m.selector_max_players({ count: maxPlayers });
			default:
				return error;
		}
	}

	const zodObject = zod(formSchema);

	const form = superForm(defaults(zodObject), {
		validators: zodClient(formSchema),
		SPA: true,

		onUpdate: ({ form: f }) => {
			if (f.valid) {
				onSubmit(
					f.data.players.map(
						(p) =>
							new Player(
								p.name,
								p.image as keyof typeof playerImages | 'default',
								p.position ?? undefined,
								p.id ?? undefined
							)
					)
				);
			}
		},
		dataType: 'json'
	});

	const { form: formData, enhance } = form;

	function addPlayer() {
		const player = new Player('', 'default');
		$formData.players = [...$formData.players, onPlayerAdd ? onPlayerAdd(player) : player];
	}

	function removePlayerByIndex(index: number) {
		$formData.players = $formData.players.filter((_, i) => i !== index);
		onPlayerRemove(index);
	}

	if (players.length > 0) {
		$formData.players = players;
	}

	$effect(() => {
		selectedImages = new SvelteSet(
			$formData.players.map((player) => player.image).filter((image) => image !== 'default')
		);
	});
</script>

<form class="flex flex-col space-y-6" use:enhance>
	<Fieldset {form} name="players">
		<Legend class="text-lg">{m.common_players()}</Legend>
		{#each $formData.players as _, i}
			{@const playerId = $formData.players[i].id}
			{@const isLocked = !!playerId && lockedPlayerIds.includes(playerId)}
			<ElementField {form} name={`players[${i}].name`}>
				<Form.Control>
					{#snippet children({ props })}
						<div class="mt-5 flex items-end">
							<div class="mr-2 grow-1">
								<Form.Label class="">{m.common_name()}</Form.Label>
								<Input
									class="mt-2"
									{...props}
									disabled={isLocked}
									bind:value={$formData.players[i].name}
								/>
							</div>
							<Form.Button
								type="button"
								disabled={$formData.players.length <= minPlayers || isLocked}
								onclick={() => removePlayerByIndex(i)}
							>
								{m.common_remove()}
							</Form.Button>
						</div>
					{/snippet}
				</Form.Control>
				<FieldErrors class="text-red-500">
					{#snippet children({ errors, errorProps })}
						{#each errors as error}
							<div {...errorProps}>{translateError(error)}</div>
						{/each}
					{/snippet}
				</FieldErrors>
			</ElementField>
			<ElementField {form} name={`players[${i}].image`}>
				<Form.Control>
					{#snippet children({ props })}
						<Collapsible.Root class="mt-5">
							<Collapsible.Trigger
								class={buttonVariants({
									variant: 'ghost',
									size: 'sm',
									class: 'w-full justify-start p-2'
								})}
							>
								<div class="flex w-full items-center space-x-2">
									<h4 class="text-sm font-semibold">{m.common_choose_character()}</h4>
									<ChevronsUpDownIcon class="ml-auto" />
									<span class="sr-only">{m.common_toggle()}</span>
								</div>
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div
									class="mt-2 grid w-full gap-2 {compact
										? 'grid-cols-3'
										: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'}"
								>
									<Toggle
										class="flex h-[unset] w-full flex-col items-center justify-center p-3"
										pressed={$formData.players[i].image === 'default'}
										disabled={isLocked}
										onclick={(e) => {
											selectedImages.delete($formData.players[i].image);
											$formData.players[i].image = 'default';
											e.preventDefault();
										}}
									>
										<p class="text-center text-xs">{m.common_no_character()}</p>
									</Toggle>
									{#each Object.entries(playerImages) as [name, image]}
										<Toggle
											class="flex h-[unset] w-full flex-col items-center justify-center p-3"
											disabled={isLocked ||
												(selectedImages.has(name) && $formData.players[i].image !== name)}
											pressed={$formData.players[i].image === name}
											onclick={(e) => {
												selectedImages.delete($formData.players[i].image);
												$formData.players[i].image = name;
												selectedImages.add(name);
												e.preventDefault();
											}}
										>
											<img src={image} alt={image} class="h-16 w-16 object-contain" />
											<p class="mt-1 text-center text-xs break-words">{name}</p>
										</Toggle>
									{/each}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/snippet}
				</Form.Control>
				<FieldErrors class="text-red-500">
					{#snippet children({ errors, errorProps })}
						{#each errors as error}
							<div {...errorProps}>{translateError(error)}</div>
						{/each}
					{/snippet}
				</FieldErrors>
			</ElementField>
		{/each}
		<FieldErrors class="text-red-500">
			{#snippet children({ errors, errorProps })}
				{#each errors as error}
					<div {...errorProps}>{translateError(error)}</div>
				{/each}
			{/snippet}
		</FieldErrors>
	</Fieldset>
	<Form.Button type="button" onclick={addPlayer} disabled={$formData.players.length >= maxPlayers}>
		{m.selector_add_player()}
	</Form.Button>
	<Form.Button>{submitText ?? m.selector_start_game()}</Form.Button>
</form>
