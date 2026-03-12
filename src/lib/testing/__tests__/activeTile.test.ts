import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { selectActiveTileView } from '../../components/game/tiles/tileVariant';

describe('getActiveTileView', () => {
	it('returns the landing variant by default', () => {
		const tile = selectActiveTileView(
			{
				message: 'Nopanheitto takaisin!',
				customElement: (() => null) as never,
				moveStartMessage: 'ignored'
			},
			'landing'
		);

		assert.equal(tile?.message, 'Nopanheitto takaisin!');
		assert.ok(tile?.element);
	});

	it('returns the move-start variant when a tile defines one', () => {
		const tile = selectActiveTileView(
			{
				message: 'landing',
				moveStartMessage:
					'Heitä kahta noppaa. Kun silmälukujen summa on 11 tai 12, liiku 35 taakse!',
				moveStartElement: (() => null) as never
			},
			'moveStart'
		);

		assert.equal(
			tile?.message,
			'Heitä kahta noppaa. Kun silmälukujen summa on 11 tai 12, liiku 35 taakse!'
		);
		assert.ok(tile?.element);
	});

	it('falls back to the landing variant when no move-start variant exists', () => {
		const tile = selectActiveTileView(
			{
				message: 'Nopanheitto takaisin!',
				customElement: (() => null) as never
			},
			'moveStart'
		);

		assert.equal(tile?.message, 'Nopanheitto takaisin!');
		assert.ok(tile?.element);
	});
});
