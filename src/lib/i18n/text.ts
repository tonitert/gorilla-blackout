/**
 * Text that may need to be translated at render time. Module-level data (tiles, wheel options,
 * announcements) stores a getter such as `() => m.tile_shot()` so the current locale is read when
 * the text is displayed rather than when the module is first loaded.
 */
export type LocalizedText = string | (() => string);

export function resolveText(text: LocalizedText): string;
export function resolveText(text: LocalizedText | undefined): string | undefined;
export function resolveText(text: LocalizedText | undefined): string | undefined {
	return typeof text === 'function' ? text() : text;
}
