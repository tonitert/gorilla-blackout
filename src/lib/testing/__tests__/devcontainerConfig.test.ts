import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../../../', import.meta.url);

async function readDevcontainerConfig() {
	const config = await readFile(new URL('.devcontainer/devcontainer.json', repoRoot), 'utf8');
	return JSON.parse(config) as {
		build: { dockerfile: string; context: string; args: { NODE_VARIANT: string } };
		containerEnv: Record<string, string>;
		forwardPorts: number[];
		mounts: string[];
		postCreateCommand: string;
		remoteUser: string;
		runArgs: string[];
		workspaceFolder: string;
	};
}

test('devcontainer installs both frontend and backend dependencies', async () => {
	const config = await readDevcontainerConfig();
	const setupScript = await readFile(new URL('.devcontainer/post-create.sh', repoRoot), 'utf8');

	assert.equal(config.postCreateCommand, 'bash .devcontainer/post-create.sh');
	assert.match(setupScript, /^#!/m);
	assert.match(setupScript, /pnpm install --frozen-lockfile/);
	assert.match(setupScript, /pnpm --dir backend install --frozen-lockfile/);
});

test('devcontainer exposes the expected toolchain and ports', async () => {
	const config = await readDevcontainerConfig();
	const dockerfile = await readFile(new URL('.devcontainer/Dockerfile', repoRoot), 'utf8');

	assert.equal(config.build.dockerfile, 'Dockerfile');
	assert.equal(config.build.context, '..');
	assert.equal(config.build.args.NODE_VARIANT, '22-bookworm');
	assert.equal(config.remoteUser, 'node');
	assert.equal(config.workspaceFolder, '/workspaces/gorilla-blackout');
	assert.deepEqual(config.forwardPorts, [5173, 4173, 3001]);
	assert.deepEqual(config.runArgs, ['--init', '--ipc=host']);
	assert.equal(config.containerEnv.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright');
	assert.equal(config.mounts.length, 1);
	assert.match(config.mounts[0], /pnpm-store/);
	assert.match(dockerfile, /devcontainers\/javascript-node:1-\$\{NODE_VARIANT\}/);
	assert.match(dockerfile, /corepack prepare pnpm@10\.31\.0 --activate/);
	assert.match(dockerfile, /npm install -g @openai\/codex/);
	assert.match(
		dockerfile,
		/curl -fsSL https:\/\/opencode\.ai\/install \| OPENCODE_INSTALL_DIR=\/usr\/local\/bin bash/
	);
	assert.match(dockerfile, /playwright@1\.49\.1 install --with-deps chromium/);
});
