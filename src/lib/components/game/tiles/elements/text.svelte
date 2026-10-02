<script lang="ts">
	import { type ElementProps } from './elementProps';
	import { resolveText, type LocalizedText } from '$lib/i18n/text';
	interface TextProps extends ElementProps {
		text: LocalizedText;
	}
	const { text }: TextProps = $props();
</script>

<p class="m-5 text-center text-xl">
	{resolveText(text)}
</p>
