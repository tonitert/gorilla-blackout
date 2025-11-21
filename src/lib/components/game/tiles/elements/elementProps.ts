import type { PlayerList } from '../../Setup.svelte';

export class ElementProps {
	players?: PlayerList;
	positions?: number[];
	currentPlayerIndex?: number;
	setActionButtonText?: (text: string | null) => void = () => {};
	movePlayer?: (positions: number, index: number, triggerTile?: boolean) => void = () => {};
}

export class ElementPropsTile extends ElementProps {
	players: PlayerList = [];
	positions: number[] = [];
	currentPlayerIndex: number = 0;
	movePlayer: (positions: number, index: number, triggerTile?: boolean) => void = () => {};
}
