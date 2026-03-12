import type { Component } from 'svelte';
import type { ElementProps } from './elements/elementProps';

export type ActiveTileTrigger = 'landing' | 'moveStart';

export interface TileVariantSource {
	image?: string;
	message?: string;
	customElement?: Component<
		ElementProps & Record<string, unknown>,
		{ onActionButtonClick?: () => void }
	>;
	props?: Record<string, unknown>;
	moveStartMessage?: string;
	moveStartElement?: Component<
		ElementProps & Record<string, unknown>,
		{ onActionButtonClick?: () => void }
	>;
	moveStartProps?: Record<string, unknown>;
}

export interface ActiveTileView {
	image?: string;
	message?: string;
	element?: Component<ElementProps & Record<string, unknown>, { onActionButtonClick?: () => void }>;
	props?: Record<string, unknown>;
}

export function selectActiveTileView(
	tile: TileVariantSource,
	trigger: ActiveTileTrigger | null
): ActiveTileView {
	const usesMoveStartVariant = trigger === 'moveStart' && tile.moveStartElement;

	return {
		image: tile.image,
		message: usesMoveStartVariant ? (tile.moveStartMessage ?? tile.message) : tile.message,
		element: usesMoveStartVariant ? tile.moveStartElement : tile.customElement,
		props: usesMoveStartVariant ? tile.moveStartProps : tile.props
	};
}
