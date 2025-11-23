/**
 * Announcements Configuration
 *
 * This file manages the announcements displayed in the Setup component.
 *
 * Each announcement can have:
 * - id: Unique identifier for the announcement
 * - title: String or Svelte component for the title
 * - content: String or Svelte component for the content
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
 *   title: 'My Title',
 *   content: MyAnnouncement,
 *   date: '2025-11-23'
 * }
 */

import type { Component } from 'svelte';
import Telegram from './announcements/Telegram.svelte';

export interface Announcement {
	id: string;
	title: string | Component;
	content: string | Component;
	date?: string;
}

export const announcements: Announcement[] = [
	{
		id: 'welcome',
		title: 'Gorilla Blackoutilla on nyt Telegram-kanava!',
		content:
			Telegram,
		date: '2025-11-23'
	}
];
