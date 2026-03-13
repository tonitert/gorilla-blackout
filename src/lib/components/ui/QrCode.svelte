<script lang="ts">
	import * as QRCode from 'qrcode';

	interface Props {
		value: string;
		alt: string;
		size?: number;
	}

	let { value, alt, size = 192 }: Props = $props();
	let dataUrl = $state('');

	$effect(() => {
		let cancelled = false;

		QRCode.toDataURL(value, {
			width: size,
			margin: 1,
			errorCorrectionLevel: 'M'
		})
			.then((nextUrl) => {
				if (!cancelled) {
					dataUrl = nextUrl;
				}
			})
			.catch((error: unknown) => {
				console.error('Failed to generate QR code:', error);
				if (!cancelled) {
					dataUrl = '';
				}
			});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if dataUrl}
	<img
		src={dataUrl}
		{alt}
		width={size}
		height={size}
		class="h-auto w-full max-w-48 rounded-lg bg-white p-2"
	/>
{/if}
