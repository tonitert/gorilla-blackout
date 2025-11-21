<script lang="ts">
	import { DoubleSide, Euler, LinearMipmapLinearFilter, NearestFilter } from 'three';
	import { T } from '@threlte/core';
	import { ImageMaterial, useTexture } from '@threlte/extras';

	const texture = useTexture('gorilla.png', {
		transform: (tex) => {
			// tex.minFilter = LinearMipmapLinearFilter; // better downscaling
			tex.generateMipmaps = false;
			tex.magFilter = NearestFilter; // smoother upscaling
			tex.anisotropy = 16; // improves sharpness at angles
			return tex;
		}
	});
</script>

<T.Mesh rotation={[-0.3, 0, 0, Euler.DEFAULT_ORDER]} position={[0, 0.8, -0.4]}>
	<T.PlaneGeometry args={[8, 8]} />
	<ImageMaterial
		texture={$texture}
		transparent={false}
		side={DoubleSide}
		brightness={0}
		contrast={0}
		hue={0}
		saturation={0}
		lightness={-0}
		zoom={1}
	/>
</T.Mesh>
<T.PlaneGeometry></T.PlaneGeometry>
