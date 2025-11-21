<script lang="ts">
	import { type ElementProps } from './elementProps';
	interface TextProps extends ElementProps {
		text: string;
	}
	const { text }: TextProps = $props();
</script>

<p class="m-5 text-center text-xl">
	{text}
</p>
