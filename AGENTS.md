# Overview 

Gorilla Blackout is a web application built with SvelteKit 5, TypeScript, and Tailwind CSS. The project uses pnpm as the package manager and is deployed to Cloudflare Pages. with `@sveltejs/adapter-static`.

The application is a board drinking game. In the game multiple players move through the board, and get shown various tiles with various tasks. The first player to get to the finish wins.

# Usage

## Install

```bash
pnpm install
```

## Development Server

```bash
pnpm run dev
```

## Practices

You must use the Playwright MCP server to completely test all changes in the browser.
Write unit and UI tests for new changes.
Test new changes after writing them.
## Translations

UI text is translated with Paraglide (`messages/fi.json`, `messages/en.json`). Finnish is the default language. Never hardcode user-visible text: add a key to both message files and call `m.key()` from `$lib/paraglide/messages`. In module-level data (tiles, wheel options, announcements), store a getter such as `() => m.key()` so the text follows the selected language. Images are not translated.
