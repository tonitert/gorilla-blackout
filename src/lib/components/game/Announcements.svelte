<script lang="ts">
	import { announcements } from './announcements';
</script>

{#if announcements.length > 0}
	<div class="announcements space-y-3">
		<h3 class="text-lg font-semibold">Tiedotteet</h3>
		<div class="space-y-2">
			{#each announcements as announcement (announcement.id)}
				<div class="rounded-lg border border-gray-600 bg-gray-800/50 p-3">
					<div class="flex items-start justify-between gap-2">
						<div class="flex-1">
							{#if typeof announcement.title === 'string'}
								<h4 class="font-medium">{announcement.title}</h4>
							{:else}
								<svelte:component this={announcement.title} />
							{/if}
						</div>
						{#if announcement.date}
							<span class="text-xs text-gray-400">{announcement.date}</span>
						{/if}
					</div>
					<div class="mt-2 text-sm text-gray-300">
						{#if typeof announcement.content === 'string'}
							<p>{announcement.content}</p>
						{:else}
							<svelte:component this={announcement.content} />
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
