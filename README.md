# Gorilla Blackout

Gorilla Blackout, made with Svelte.

Git LFS is not used at the moment due to it giving the error "batch response: Git LFS is disabled for this repository." when pushing to GitHub.

## Prerequisites

- [Node.js](https://nodejs.org/) v22.18.0 or higher (specified in `.nvmrc`)
- [pnpm](https://pnpm.io/) package manager

### Installing pnpm

If you don't have pnpm installed, you can install it globally:

```bash
npm install -g pnpm
```

## Installation

Install the project dependencies:

```bash
pnpm install
```

## Dev Container

The repository includes a Dockerfile-based devcontainer in `.devcontainer/devcontainer.json`.

It provides:

- Node.js 22
- pnpm 10.31.0
- OpenAI Codex CLI
- OpenCode CLI
- Playwright browser dependencies plus Chromium
- Automatic `pnpm install` for both the frontend and `backend/`

The container runs as `root` so package installs can write to Docker bind mounts reliably.

After opening the repo in the container, run the usual commands:

```bash
pnpm run dev
pnpm --dir backend run dev
```

## Development

### Running the Development Server

Start the frontend development server:

```bash
pnpm run dev
```

Start the multiplayer backend in a second terminal:

```bash
cd backend
pnpm install
pnpm run dev
```

The frontend will be available at `http://localhost:5173` and backend at `http://localhost:3001`.

### Preview Production Build

To preview the production build locally:

```bash
pnpm run preview
```

## Building

Build the application for production:

```bash
pnpm build
```

The built files will be output to the `build` directory.

## Code Quality

### Linting

Check code for linting issues:

```bash
pnpm run lint
```

This runs both Prettier formatting checks and ESLint.

### Formatting

Automatically format code with Prettier:

```bash
pnpm run format
```

### Type Checking

Run Svelte type checking:

```bash
pnpm run check
```

To run type checking in watch mode:

```bash
pnpm run check:watch
```

## Testing

Run end-to-end tests with Playwright:

```bash
pnpm run test:e2e
```

Or simply:

```bash
pnpm test
```

## Deployment

### Docker

Build and run the frontend + multiplayer backend using Docker:

```bash
docker-compose up --build
```

The frontend will be available at `http://localhost` and backend at `http://localhost:3001`.

### Cloudflare Pages

The application is deployed to Cloudflare Pages with the custom domain `blackout.beer`.

To deploy manually using Wrangler:

```bash
pnpm build
pnpx wrangler pages deploy
```

Alternatively, you can use the legacy deploy script (which deploys to GitHub Pages):

```bash
pnpm run deploy
```
