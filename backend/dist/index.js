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
const gamePlayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string(),
    position: z.number().int().nonnegative()
});
const gameStateSchema = z.object({
    players: z.array(gamePlayerSchema),
    turn: z.number().int().nonnegative(),
    currentTurnPlayerId: z.string().nullable(),
    turnInProgress: z.boolean(),
    turnOwnerId: z.string().nullable(),
    phase: z.enum(['idle', 'rolling', 'tile']),
    activeTilePosition: z.number().int().nonnegative().nullable(),
    activeTileTrigger: z.enum(['landing', 'moveStart']).nullable(),
    activeTileSessionId: z.number().int().nonnegative(),
    diceValue: z.number().int().min(1).max(6).nullable(),
    tileState: z.record(z.string(), z.unknown()).nullable(),
    inGame: z.boolean(),
    spacebarTooltipShown: z.boolean(),
    version: z.number(),
    versionAvailable: z.string().nullable()
});
const lobbies = new Map();
const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const publicLobby = (lobby) => ({
    code: lobby.code,
    hostId: lobby.hostId,
    players: lobby.players,
    inGame: lobby.inGame
});
const createInitialGameState = (lobby) => ({
    players: lobby.players,
    turn: 0,
    currentTurnPlayerId: lobby.players[0]?.id ?? null,
    turnInProgress: false,
    turnOwnerId: null,
    phase: 'idle',
    activeTilePosition: null,
    activeTileTrigger: null,
    activeTileSessionId: 0,
    diceValue: null,
    tileState: null,
    inGame: true,
    spacebarTooltipShown: false,
    version: 1,
    versionAvailable: null
});
function hasDuplicateImage(lobby, playerId, image) {
    if (image === 'default')
        return false;
    return lobby.players.some((player) => player.id !== playerId && player.image === image);
}
app.post('/api/lobbies', async (request, reply) => {
    const parsed = playerSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
    }
    let code = generateCode();
    while (lobbies.has(code))
        code = generateCode();
    const host = { ...parsed.data, id: randomUUID(), position: 0 };
    const lobby = {
        code,
        hostId: host.id,
        players: [host],
        inGame: false,
        state: null,
        pendingRoll: null
    };
    lobbies.set(code, lobby);
    return { code, playerId: host.id, lobby: publicLobby(lobby) };
});
app.post('/api/lobbies/:code/join', async (request, reply) => {
    const parsed = playerSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
    }
    const code = request.params.code.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    if (lobby.inGame)
        return reply.code(409).send({ error: 'Game already started' });
    if (hasDuplicateImage(lobby, '', parsed.data.image)) {
        return reply.code(409).send({ error: 'Character already selected' });
    }
    const player = { ...parsed.data, id: randomUUID(), position: 0 };
    lobby.players.push(player);
    io.to(code).emit('lobby:update', publicLobby(lobby));
    return { code, playerId: player.id, lobby: publicLobby(lobby) };
});
app.post('/api/lobbies/:code/player', async (request, reply) => {
    const code = request.params.code.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    if (lobby.inGame)
        return reply.code(409).send({ error: 'Game already started' });
    const playerId = request.body?.playerId;
    if (!playerId)
        return reply.code(400).send({ error: 'playerId required' });
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player)
        return reply.code(404).send({ error: 'Player not found' });
    if (request.body.name !== undefined) {
        const name = request.body.name.trim();
        if (name.length < 1 || name.length > 100)
            return reply.code(400).send({ error: 'Invalid name' });
        player.name = name;
    }
    if (request.body.image !== undefined) {
        const image = request.body.image.trim();
        if (!image)
            return reply.code(400).send({ error: 'Invalid image' });
        if (hasDuplicateImage(lobby, player.id, image)) {
            return reply.code(409).send({ error: 'Character already selected' });
        }
        player.image = image;
    }
    io.to(code).emit('lobby:update', publicLobby(lobby));
    return { lobby: publicLobby(lobby) };
});
app.get('/api/lobbies/:code', async (request, reply) => {
    const lobby = lobbies.get(request.params.code.toUpperCase());
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    return { lobby: publicLobby(lobby) };
});
app.post('/api/lobbies/:code/start', async (request, reply) => {
    const code = request.params.code.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    if (request.body?.playerId !== lobby.hostId)
        return reply.code(403).send({ error: 'Only host can start' });
    if (lobby.inGame)
        return reply.code(409).send({ error: 'Game already started' });
    lobby.inGame = true;
    lobby.state = createInitialGameState(lobby);
    lobby.pendingRoll = null;
    io.to(code).emit('lobby:update', publicLobby(lobby));
    io.to(code).emit('game:state', lobby.state);
    return { lobby: publicLobby(lobby), state: lobby.state };
});
const server = await app.listen({ port, host: '0.0.0.0' });
const io = new Server(app.server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
    const code = socket.handshake.auth.code?.toUpperCase();
    const playerId = socket.handshake.auth.playerId;
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
    if (lobby.state)
        socket.emit('game:state', lobby.state);
    socket.on('game:state:update', (payload) => {
        if (!lobby.inGame || !payload)
            return;
        if (payload.actorId !== playerId)
            return;
        const candidateState = payload.state;
        const parsedState = gameStateSchema.safeParse(candidateState);
        if (!parsedState.success)
            return;
        const previous = lobby.state;
        const allowedActor = previous?.turnInProgress
            ? previous.turnOwnerId
            : previous?.currentTurnPlayerId;
        if (allowedActor && allowedActor !== playerId)
            return;
        lobby.state = parsedState.data;
        if (lobby.state.diceValue !== null) {
            lobby.pendingRoll = null;
        }
        io.to(code).emit('game:state', lobby.state);
    });
    socket.on('game:roll:request', (payload) => {
        if (!lobby.inGame || !lobby.state)
            return;
        if (payload.actorId !== playerId)
            return;
        const allowedActor = lobby.state.turnInProgress
            ? lobby.state.turnOwnerId
            : lobby.state.currentTurnPlayerId;
        if (allowedActor && allowedActor !== playerId)
            return;
        if (lobby.state.phase !== 'rolling' || lobby.state.diceValue !== null)
            return;
        if (lobby.pendingRoll === null) {
            lobby.pendingRoll = Math.floor(Math.random() * 6) + 1;
        }
        io.to(code).emit('game:roll', lobby.pendingRoll);
    });
});
app.log.info(`Backend listening on ${server}`);
