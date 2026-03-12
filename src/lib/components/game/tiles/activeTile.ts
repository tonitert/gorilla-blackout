import { tiles } from './tiles';
import { selectActiveTileView, type ActiveTileTrigger, type ActiveTileView } from './tileVariant';

export function getActiveTileView(
	position: number | null,
	trigger: ActiveTileTrigger | null
): ActiveTileView | null {
	if (position === null || !tiles.hasOwnProperty(position)) {
		return null;
	}

	const tile = tiles[position];

	return selectActiveTileView(tile, trigger);
}
