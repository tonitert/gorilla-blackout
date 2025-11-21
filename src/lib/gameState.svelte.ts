import { writable, type Writable, get } from 'svelte/store';
import { type PlayerList } from './components/game/PlayerSelector.svelte';
import { stateVersion } from './gameStateVersion';
import { setItem, getItem } from './helpers/indexedDB';

export interface GameState {
	players: PlayerList;
	turn: number;
	currentTurnPlayerId: string | null;
	inGame: boolean;
	spacebarTooltipShown: boolean;
	version: number;
	versionAvailable: string | null;
}

const constantAttributes = {
	version: stateVersion,
	versionAvailable: null
};

export const gameStateStore: Writable<GameState> = writable({
	players: [],
	turn: 0,
	currentTurnPlayerId: null,
	inGame: false,
	spacebarTooltipShown: false,
	...constantAttributes
});
let firstLoad = true;
if (typeof window !== 'undefined') {
	gameStateStore.subscribe((gameState) => {
		if (firstLoad) {
			firstLoad = false;
			return;
		}
		setItem('gameState', {
			...$state.snapshot(gameState),
			...constantAttributes
		}).catch((error) => {
			console.error('Failed to save game state to IndexedDB:', error);
		});
	});
}

export function clearGameState() {
	gameStateStore.set({
		...get(gameStateStore),
		...constantAttributes,
		players: [],
		turn: 0,
		currentTurnPlayerId: null,
		inGame: false
	});
}

export async function tryLoadData(): Promise<GameState | undefined> {
	if (typeof window === 'undefined') {
		return undefined;
	}
	try {
		const data = await getItem<GameState>('gameState');
		gameStateStore.set({
			...get(gameStateStore),
			spacebarTooltipShown: data?.spacebarTooltipShown || false
		});

		return data;
	} catch (error) {
		console.error('Failed to load game state from IndexedDB:', error);
		return undefined;
	}
}
