/**
 * Announcements Configuration
 *
 * This file manages the announcements displayed in the Setup component.
 *
 * Each announcement can have:
 * - id: Unique identifier for the announcement
 * - title: Translated text getter (e.g. () => m.some_key()) or { component } for the title
 * - content: Translated text getter or { component } for the content
 * - date: Optional date string (displayed in the UI)
 *
 * To add a new announcement with a Svelte component:
 * 1. Create a new .svelte file in this directory
 * 2. Import it at the top of this file
 * 3. Add it to the announcements array
 *
 * Example:
 * import MyAnnouncement from './MyAnnouncement.svelte';
 *
 * {
 *   id: 'my-announcement',
 *   title: () => m.my_title(), // add the key to messages/fi.json and messages/en.json
 *   content: { component: MyAnnouncement },
 *   date: '2025-11-23'
 * }
 */

import type { Component } from 'svelte';
import Telegram from './announcements/Telegram.svelte';
import { m } from '$lib/paraglide/messages';
import type { LocalizedText } from '$lib/i18n/text';

// Components are wrapped in an object because both Svelte components and translation getters are
// plain functions and could not be told apart otherwise.
export type AnnouncementPart = LocalizedText | { component: Component };

export interface Announcement {
	id: string;
	title: AnnouncementPart;
	content: AnnouncementPart;
	date?: string;
}

export const announcements: Announcement[] = [
	{
		id: 'welcome',
		title: () => m.announce_telegram_title(),
		content: { component: Telegram },
		date: '2025-11-23'
	}
];
