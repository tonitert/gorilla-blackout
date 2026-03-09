import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT ?? 3001);
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const playerSchema = z.object({
	name: z.string().min(1).max(100),
	image: z.string().min(1)
});

type Player = z.infer<typeof playerSchema> & { id: string; position: number };

type Lobby = {
	code: string;
	hostId: string;
	players: Player[];
	inGame: boolean;
	state: unknown;
};

const lobbies = new Map<string, Lobby>();

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const publicLobby = (lobby: Lobby) => ({
	code: lobby.code,
	hostId: lobby.hostId,
	players: lobby.players,
	inGame: lobby.inGame
});

const createInitialGameState = (lobby: Lobby) => ({
	players: lobby.players,
	turn: 0,
	currentTurnPlayerId: lobby.players[0]?.id ?? null,
	turnInProgress: false,
	turnOwnerId: null,
	phase: 'idle',
	activeTilePosition: null,
	diceValue: null,
	inGame: true,
	spacebarTooltipShown: false,
	version: 1,
	versionAvailable: null
});

function hasDuplicateImage(lobby: Lobby, playerId: string, image: string): boolean {
	if (image === 'default') return false;
	return lobby.players.some((player) => player.id !== playerId && player.image === image);
}

app.post('/api/lobbies', async (request, reply) => {
	const parsed = playerSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: parsed.error.message });
	}
	let code = generateCode();
	while (lobbies.has(code)) code = generateCode();
	const host: Player = { ...parsed.data, id: randomUUID(), position: 0 };
	const lobby: Lobby = { code, hostId: host.id, players: [host], inGame: false, state: null };
	lobbies.set(code, lobby);
	return { code, playerId: host.id, lobby: publicLobby(lobby) };
});

app.post<{ Params: { code: string } }>('/api/lobbies/:code/join', async (request, reply) => {
	const parsed = playerSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: parsed.error.message });
	}
	const code = request.params.code.toUpperCase();
	const lobby = lobbies.get(code);
	if (!lobby) return reply.code(404).send({ error: 'Lobby not found' });
	if (lobby.inGame) return reply.code(409).send({ error: 'Game already started' });
	if (hasDuplicateImage(lobby, '', parsed.data.image)) {
		return reply.code(409).send({ error: 'Character already selected' });
	}
	const player: Player = { ...parsed.data, id: randomUUID(), position: 0 };
	lobby.players.push(player);
	io.to(code).emit('lobby:update', publicLobby(lobby));
	return { code, playerId: player.id, lobby: publicLobby(lobby) };
});

app.post<{ Params: { code: string }; Body: { playerId?: string; name?: string; image?: string } }>(
	'/api/lobbies/:code/player',
	async (request, reply) => {
		const code = request.params.code.toUpperCase();
		const lobby = lobbies.get(code);
		if (!lobby) return reply.code(404).send({ error: 'Lobby not found' });
		if (lobby.inGame) return reply.code(409).send({ error: 'Game already started' });
		const playerId = request.body?.playerId;
		if (!playerId) return reply.code(400).send({ error: 'playerId required' });

		const player = lobby.players.find((p) => p.id === playerId);
		if (!player) return reply.code(404).send({ error: 'Player not found' });

		if (request.body.name !== undefined) {
			const name = request.body.name.trim();
			if (name.length < 1 || name.length > 100) {
				return reply.code(400).send({ error: 'Invalid name' });
			}
			player.name = name;
		}

		if (request.body.image !== undefined) {
			const image = request.body.image.trim();
			if (!image) return reply.code(400).send({ error: 'Invalid image' });
			if (hasDuplicateImage(lobby, player.id, image)) {
				return reply.code(409).send({ error: 'Character already selected' });
			}
			player.image = image;
		}

		io.to(code).emit('lobby:update', publicLobby(lobby));
		return { lobby: publicLobby(lobby) };
	}
);

app.get<{ Params: { code: string } }>('/api/lobbies/:code', async (request, reply) => {
	const lobby = lobbies.get(request.params.code.toUpperCase());
	if (!lobby) return reply.code(404).send({ error: 'Lobby not found' });
	return { lobby: publicLobby(lobby) };
});


app.post<{ Params: { code: string }; Body: { playerId?: string } }>(
	'/api/lobbies/:code/start',
	async (request, reply) => {
		const code = request.params.code.toUpperCase();
		const lobby = lobbies.get(code);
		if (!lobby) return reply.code(404).send({ error: 'Lobby not found' });
		if (request.body?.playerId !== lobby.hostId) return reply.code(403).send({ error: 'Only host can start' });
		lobby.inGame = true;
		lobby.state = createInitialGameState(lobby);
		io.to(code).emit('lobby:update', publicLobby(lobby));
		io.to(code).emit('game:state', lobby.state);
		return { lobby: publicLobby(lobby), state: lobby.state };
	}
);

const server = await app.listen({ port, host: '0.0.0.0' });
const io = new Server(app.server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
	const code = (socket.handshake.auth.code as string | undefined)?.toUpperCase();
	const playerId = socket.handshake.auth.playerId as string | undefined;
	if (!code || !playerId) {
		socket.disconnect();
		return;
	}
	const lobby = lobbies.get(code);
	if (!lobby || !lobby.players.find((p) => p.id === playerId)) {
		socket.disconnect();
		return;
	}
	socket.join(code);
	socket.emit('lobby:update', publicLobby(lobby));
	if (lobby.state) socket.emit('game:state', lobby.state);

	socket.on('game:start', () => {
		if (playerId !== lobby.hostId) return;
		lobby.inGame = true;
		lobby.state = createInitialGameState(lobby);
		io.to(code).emit('lobby:update', publicLobby(lobby));
		io.to(code).emit('game:state', lobby.state);
	});

	socket.on('game:state:update', (payload) => {
		if (!lobby.inGame) return;
		if (!payload) return;
		const nextState = (payload as { state?: unknown }).state ?? payload;
		if (typeof nextState !== 'object' || nextState === null) return;
		if ((payload as { actorId?: string }).actorId && (payload as { actorId?: string }).actorId !== playerId) {
			return;
		}

		const previous = (lobby.state ?? {}) as {
			currentTurnPlayerId?: string | null;
			turnInProgress?: boolean;
			turnOwnerId?: string | null;
		};
		const allowedActor = previous.turnInProgress
			? previous.turnOwnerId
			: previous.currentTurnPlayerId;
		if (allowedActor && allowedActor !== playerId) {
			return;
		}

		lobby.state = nextState;
		io.to(code).emit('game:state', nextState);
	});
});

app.log.info(`Backend listening on ${server}`);
