import { writable, type Writable } from "svelte/store";
import type { PlayerList } from "./components/game/Setup.svelte";

export interface GameState {
    players: PlayerList;
    turn: number;
    positions: number[];
    inGame: boolean;
}  

export const gameStateStore: Writable<GameState> = writable({
    players: [],
    turn: 0,
    positions: [],
    inGame: false
});

if (typeof window !== 'undefined') {
    gameStateStore.subscribe((gameState) => {
        if (gameState.inGame) {
            window.localStorage?.setItem("gameState", JSON.stringify(gameState));
        }
    });
}

export function tryLoadData(): GameState | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }
    const data = window.localStorage?.getItem("gameState");
    if (data) {
        return JSON.parse(data);
    }
    return undefined;
}