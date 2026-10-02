<script lang="ts">
	import { announcements, type AnnouncementPart } from './announcements';
	import { resolveText } from '$lib/i18n/text';
	import { m } from '$lib/paraglide/messages';
</script>

{#snippet part(value: AnnouncementPart, Tag: 'h4' | 'p', className: string)}
	{#if typeof value === 'object'}
		<value.component />
	{:else}
		<svelte:element this={Tag} class={className}>{resolveText(value)}</svelte:element>
	{/if}
{/snippet}

{#if announcements.length > 0}
	<div class="announcements space-y-3">
		<h3 class="text-lg font-semibold">{m.announce_heading()}</h3>
		<div class="space-y-2">
			{#each announcements as announcement (announcement.id)}
				<div class="rounded-lg border border-gray-600 bg-gray-800/50 p-3">
					<div class="flex items-start justify-between gap-2">
						<div class="flex-1">
							{@render part(announcement.title, 'h4', 'font-medium')}
						</div>
						{#if announcement.date}
							<span class="text-xs text-gray-400">{announcement.date}</span>
						{/if}
					</div>
					<div class="mt-2 text-sm text-gray-300">
						{@render part(announcement.content, 'p', '')}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
