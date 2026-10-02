import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { getDiceTileButtonText } from '../../components/game/tiles/elements/advancedTileState';
import { resolveText } from '../../i18n/text';
import { m } from '../../paraglide/messages.js';
import { baseLocale, getLocale, overwriteGetLocale, type Locale } from '../../paraglide/runtime.js';

function readMessages(locale: string): Record<string, string> {
	const { $schema: _schema, ...messages } = JSON.parse(
		readFileSync(new URL(`../../../../messages/${locale}.json`, import.meta.url), 'utf-8')
	);
	return messages;
}

describe('i18n', () => {
	const fi = readMessages('fi');
	const en = readMessages('en');

	it('uses Finnish as the default language', () => {
		assert.equal(baseLocale, 'fi');
		assert.equal(getLocale(), 'fi');
		assert.equal(m.selector_start_game(), 'Aloita peli');
	});

	it('defines every message in both Finnish and English', () => {
		assert.deepEqual(Object.keys(en).sort(), Object.keys(fi).sort());
	});

	it('has no empty translations', () => {
		for (const [locale, messages] of Object.entries({ fi, en })) {
			for (const [key, value] of Object.entries(messages)) {
				assert.ok(value.trim().length > 0, `${locale}.${key} is empty`);
			}
		}
	});

	it('uses the same parameters in both languages', () => {
		const params = (value: string) =>
			[...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
		for (const key of Object.keys(fi)) {
			assert.deepEqual(params(en[key]), params(fi[key]), `parameters differ for ${key}`);
		}
	});

	it('translates text when the locale changes', () => {
		// Mirrors src/lib/i18n/locale.svelte.ts, which backs getLocale with reactive state.
		const originalGetLocale = getLocale;
		let current: Locale = 'en';
		overwriteGetLocale(() => current);

		try {
			assert.equal(getDiceTileButtonText('waitingForRoll'), 'Roll the die');
			assert.equal(m.game_turn({ name: 'Aino' }), "Aino's turn!");
			assert.equal(
				resolveText(() => m.tile_shot()),
				'Take a shot!'
			);

			current = 'fi';
			assert.equal(getDiceTileButtonText('waitingForRoll'), 'Heitä noppaa');
			assert.equal(m.game_turn({ name: 'Aino' }), 'Pelaajan Aino vuoro!');
		} finally {
			overwriteGetLocale(originalGetLocale);
		}
	});
});
