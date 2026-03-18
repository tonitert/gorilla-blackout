import type { PlayerList } from '../../PlayerSelector.svelte';

export class ElementProps {
	players?: PlayerList;
	positions?: number[];
	currentPlayerIndex?: number;
	setActionButtonText?: (text: string | null) => void = () => {};
	movePlayer?: (positions: number, index: number, triggerTile?: boolean) => void = () => {};
	tileState?: Record<string, unknown> | null;
	setTileState?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
	canAct?: boolean;
}

export class ElementPropsTile extends ElementProps {
	players: PlayerList = [];
	positions: number[] = [];
	currentPlayerIndex: number = 0;
	movePlayer: (positions: number, index: number, triggerTile?: boolean) => void = () => {};
}
