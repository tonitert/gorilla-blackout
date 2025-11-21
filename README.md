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

## Development

### Running the Development Server

Start the development server with hot module replacement:

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

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

Build and run the application using Docker:

```bash
docker-compose up --build
```

The application will be available at `http://localhost`.

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
