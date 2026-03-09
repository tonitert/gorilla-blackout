ARG NODE_VARIANT=22-bookworm
FROM mcr.microsoft.com/devcontainers/javascript-node:1-${NODE_VARIANT}

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
	&& export DEBIAN_FRONTEND=noninteractive \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		curl \
		git-lfs \
		openssh-client \
	&& rm -rf /var/lib/apt/lists/*

RUN corepack enable \
	&& corepack prepare pnpm@10.31.0 --activate \
	&& npm install -g @openai/codex \
	&& curl -fsSL https://opencode.ai/install | OPENCODE_INSTALL_DIR=/usr/local/bin bash \
	&& npx -y playwright@1.49.1 install --with-deps chromium \
	&& chown -R node:node /ms-playwright
