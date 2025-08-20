import type { PlayerList } from "../../Setup.svelte"

export class ElementProps {
    players?: PlayerList
    currentPlayerIndex?: number
    finishedCallback?: () => void = () => {}
    setActionButtonText?: (text: string | null) => void = () => {}
    movePlayer?: (positions: number, index: number) => void = () => {}
}

export class ElementPropsTile extends ElementProps {
    players: PlayerList = []
    currentPlayerIndex: number = 0;
    movePlayer: ((positions: number, index: number) => void) = () => {};
}
