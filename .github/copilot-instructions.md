# Copilot Instructions for Gorilla Blackout

## Project Overview

Gorilla Blackout is a web application built with SvelteKit 5, TypeScript, and Tailwind CSS. The project uses pnpm as the package manager and is deployed to Cloudflare Pages.

## Technology Stack

- **Framework**: SvelteKit 5 with Svelte 5
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS 4 with custom configuration
- **Testing**: Playwright for end-to-end tests
- **Build Tool**: Vite 7
- **Package Manager**: pnpm
- **Deployment**: Cloudflare Pages (custom domain: blackout.beer)

## Code Style and Conventions

### Formatting

- **Use tabs** for indentation (not spaces)
- **Single quotes** for strings
- **No trailing commas**
- **Print width**: 100 characters
- All code must be formatted with Prettier using the project's `.prettierrc` configuration
- Run `pnpm run format` to auto-format code

### Linting

- ESLint is configured with TypeScript and Svelte plugins
- Prettier integration is enabled
- Run `pnpm run lint` to check for issues
- The `no-undef` rule is disabled for TypeScript files (as recommended by typescript-eslint)

### TypeScript

- **Strict mode** is enabled
- Use proper TypeScript types instead of `any` when possible
- `allowJs` and `checkJs` are enabled for JavaScript files
- Run `pnpm run check` for type checking

### Svelte

- Use Svelte 5 syntax and features (runes, snippets, etc.)
- Components should use proper TypeScript typing
- Follow the existing component structure in `src/lib/components/`

## Project Structure

```
src/
├── lib/
│   └── components/     # Reusable Svelte components
│       ├── game/       # Game-related components
│       └── ui/         # UI components
├── routes/             # SvelteKit routes (file-based routing)
├── app.html            # HTML template
├── app.css             # Global styles
├── hooks.server.ts     # SvelteKit server hooks
└── hooks.ts            # SvelteKit hooks
```

## Development Commands

### Installation

```bash
pnpm install
```

### Development Server

```bash
pnpm run dev
```

The app runs on `http://localhost:5173`

### Building

```bash
pnpm build
```

Outputs to the `build/` directory.

### Testing

```bash
pnpm test          # Run Playwright e2e tests
pnpm run test:e2e  # Run Playwright e2e tests (same as above)
```

### Code Quality

```bash
pnpm run lint         # Check formatting and linting
pnpm run format       # Auto-format with Prettier
pnpm run check        # Run Svelte type checking and sync
pnpm run check:watch  # Type check in watch mode
```

## Important Conventions

1. **Tabs over spaces**: Always use tabs for indentation
2. **Single quotes**: Use single quotes for strings in JavaScript/TypeScript
3. **Component organization**: Keep game logic in `src/lib/components/game/` and UI components in `src/lib/components/ui/`
4. **Type safety**: Maintain strict TypeScript typing throughout the codebase
5. **Svelte 5**: Use modern Svelte 5 features (runes like `$state`, `$derived`, `$effect`)
6. **Responsive design**: Use Tailwind CSS for styling with mobile-first approach

## Testing Guidelines

- Write Playwright tests in the `e2e/` directory
- Tests use the `@playwright/test` framework
- Follow the existing test pattern in `e2e/demo.test.ts`

## Deployment

- The project uses `@sveltejs/adapter-static` for static site generation
- Primary deployment: Cloudflare Pages via Wrangler
- Alternative: GitHub Pages (legacy)
- Configuration: See `wrangler.jsonc` and `svelte.config.js`

## Dependencies

- Avoid adding new dependencies unless necessary
- Use pnpm for installing packages: `pnpm add <package>`
- Development dependencies: `pnpm add -D <package>`

## Best Practices

1. **Always run tests and linting** before committing changes
2. **Keep components small and focused** - split large components into smaller ones
3. **Use TypeScript types** - avoid `any` types when possible
4. **Follow existing patterns** - check similar components before creating new ones
5. **Write meaningful commit messages** - describe what and why, not how
6. **Test your changes** - ensure the app builds and runs correctly
