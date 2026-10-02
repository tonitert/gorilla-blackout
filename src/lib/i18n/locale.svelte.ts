import {
	baseLocale,
	isLocale,
	locales,
	localStorageKey,
	overwriteGetLocale,
	overwriteSetLocale,
	type Locale
} from '$lib/paraglide/runtime';

export { locales, type Locale };

// Paraglide's default getLocale is not reactive. Backing it with $state makes every m.*() call
// re-render when the language changes, so switching does not need a page reload (which would
// otherwise reset the running game UI).
let current = $state<Locale>(baseLocale);

overwriteGetLocale(() => current);
overwriteSetLocale((newLocale) => {
	current = newLocale;

	if (typeof document !== 'undefined') {
		document.documentElement.lang = newLocale;
	}

	try {
		localStorage.setItem(localStorageKey, newLocale);
	} catch {
		// Storage can be unavailable (private mode, blocked site data); the choice just won't persist.
	}
});

/**
 * Applies the stored locale. Call after hydration: the site is prerendered in the base locale,
 * so switching before hydration would cause text mismatches.
 */
export function initLocale() {
	let stored: string | null = null;

	try {
		stored = localStorage.getItem(localStorageKey);
	} catch {
		return;
	}

	if (stored && isLocale(stored) && stored !== current) {
		current = stored;
		document.documentElement.lang = stored;
	}
}
