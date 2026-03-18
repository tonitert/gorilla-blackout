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
const maxLateJoinPosition = 54;
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
function calculateLateJoinPosition(players) {
    if (players.length === 0) {
        return 0;
    }
    return Math.min(Math.floor(players.reduce((sum, player) => sum + player.position, 0) / players.length), maxLateJoinPosition);
}
function broadcastLobby(lobby) {
    io.to(lobby.code).emit('lobby:update', publicLobby(lobby));
}
function broadcastGameState(lobby) {
    if (!lobby.state) {
        return;
    }
    io.to(lobby.code).emit('game:state', lobby.state);
}
function hasDuplicateImage(lobby, playerId, image) {
    if (image === 'default')
        return false;
    return lobby.players.some((player) => player.id !== playerId && player.image === image);
}
function removePlayerFromLobby(lobby, targetPlayerId) {
    const removedWasHost = lobby.hostId === targetPlayerId;
    const nextPlayers = lobby.players.filter((player) => player.id !== targetPlayerId);
    if (nextPlayers.length === lobby.players.length) {
        return {
            removed: false,
            removedWasHost,
            hostReassigned: false,
            lobbyClosed: false,
            gameEnded: false
        };
    }
    lobby.players = nextPlayers;
    const lobbyClosed = lobby.players.length === 0;
    if (lobbyClosed) {
        lobby.inGame = false;
        lobby.state = null;
        lobby.pendingRoll = null;
        return {
            removed: true,
            removedWasHost,
            hostReassigned: false,
            lobbyClosed: true,
            gameEnded: false
        };
    }
    let hostReassigned = false;
    if (removedWasHost) {
        hostReassigned = true;
        lobby.hostId = lobby.players[0].id;
    }
    const gameEnded = false;
    if (lobby.state) {
        const remainingStatePlayers = lobby.state.players.filter((player) => player.id !== targetPlayerId);
        let nextTurnInProgress = lobby.state.turnInProgress;
        let nextTurnOwnerId = lobby.state.turnOwnerId;
        let nextCurrentTurnPlayerId = lobby.state.currentTurnPlayerId;
        let nextPhase = lobby.state.phase;
        let nextActiveTilePosition = lobby.state.activeTilePosition;
        let nextActiveTileTrigger = lobby.state.activeTileTrigger;
        let nextDiceValue = lobby.state.diceValue;
        if (nextTurnOwnerId === targetPlayerId) {
            nextTurnInProgress = false;
            nextTurnOwnerId = null;
            nextPhase = 'idle';
            nextActiveTilePosition = null;
            nextActiveTileTrigger = null;
            nextDiceValue = null;
        }
        if (nextCurrentTurnPlayerId === targetPlayerId) {
            nextCurrentTurnPlayerId = remainingStatePlayers[0]?.id ?? null;
        }
        lobby.state = {
            ...lobby.state,
            players: remainingStatePlayers,
            turnInProgress: nextTurnInProgress,
            turnOwnerId: nextTurnOwnerId,
            currentTurnPlayerId: nextCurrentTurnPlayerId,
            phase: nextPhase,
            activeTilePosition: nextActiveTilePosition,
            activeTileTrigger: nextActiveTileTrigger,
            diceValue: nextDiceValue
        };
    }
    return {
        removed: true,
        removedWasHost,
        hostReassigned,
        lobbyClosed: false,
        gameEnded
    };
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
    if (hasDuplicateImage(lobby, '', parsed.data.image)) {
        return reply.code(409).send({ error: 'Character already selected' });
    }
    const currentPlayers = lobby.state?.players ?? lobby.players;
    const player = {
        ...parsed.data,
        id: randomUUID(),
        position: lobby.inGame ? calculateLateJoinPosition(currentPlayers) : 0
    };
    lobby.players.push(player);
    if (lobby.state) {
        lobby.state = {
            ...lobby.state,
            players: [...lobby.state.players, player]
        };
    }
    broadcastLobby(lobby);
    broadcastGameState(lobby);
    return { code, playerId: player.id, lobby: publicLobby(lobby) };
});
app.post('/api/lobbies/:code/player', async (request, reply) => {
    const code = request.params.code.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    const playerId = request.body?.playerId;
    if (!playerId)
        return reply.code(400).send({ error: 'playerId required' });
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player)
        return reply.code(404).send({ error: 'Player not found' });
    const statePlayer = lobby.state?.players.find((p) => p.id === playerId);
    if (request.body.name !== undefined) {
        const name = request.body.name.trim();
        if (name.length < 1 || name.length > 100)
            return reply.code(400).send({ error: 'Invalid name' });
        player.name = name;
        if (statePlayer) {
            statePlayer.name = name;
        }
    }
    if (request.body.image !== undefined) {
        const image = request.body.image.trim();
        if (!image)
            return reply.code(400).send({ error: 'Invalid image' });
        if (hasDuplicateImage(lobby, player.id, image)) {
            return reply.code(409).send({ error: 'Character already selected' });
        }
        player.image = image;
        if (statePlayer) {
            statePlayer.image = image;
        }
    }
    broadcastLobby(lobby);
    broadcastGameState(lobby);
    return { lobby: publicLobby(lobby) };
});
app.post('/api/lobbies/:code/player/remove', async (request, reply) => {
    const code = request.params.code.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby)
        return reply.code(404).send({ error: 'Lobby not found' });
    const actorId = request.body?.actorId;
    const targetPlayerId = request.body?.targetPlayerId;
    if (!actorId || !targetPlayerId) {
        return reply.code(400).send({ error: 'actorId and targetPlayerId required' });
    }
    const actor = lobby.players.find((player) => player.id === actorId);
    if (!actor)
        return reply.code(403).send({ error: 'Actor not in lobby' });
    const target = lobby.players.find((player) => player.id === targetPlayerId);
    if (!target)
        return reply.code(404).send({ error: 'Player not found' });
    const actorIsHost = lobby.hostId === actorId;
    const actorRemovingSelf = actorId === targetPlayerId;
    if (!actorIsHost && !actorRemovingSelf) {
        return reply.code(403).send({ error: 'Not allowed to remove player' });
    }
    const result = removePlayerFromLobby(lobby, targetPlayerId);
    if (!result.removed) {
        return reply.code(404).send({ error: 'Player not found' });
    }
    if (result.lobbyClosed) {
        io.to(code).emit('lobby:closed');
        lobbies.delete(code);
        return {
            lobby: null,
            removedPlayerId: targetPlayerId,
            lobbyClosed: true,
            hostReassigned: false,
            gameEnded: result.gameEnded
        };
    }
    broadcastLobby(lobby);
    io.to(code).emit('lobby:player-removed', { playerId: targetPlayerId });
    broadcastGameState(lobby);
    return {
        lobby: publicLobby(lobby),
        removedPlayerId: targetPlayerId,
        lobbyClosed: false,
        hostReassigned: result.hostReassigned,
        gameEnded: result.gameEnded
    };
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
function buildSocketError(code) {
    const error = new Error(code);
    error.data = { code };
    return error;
}
function emitCurrentSocketState(socket, lobby) {
    socket.emit('lobby:update', publicLobby(lobby));
    if (lobby.state) {
        socket.emit('game:state', lobby.state);
    }
    if (lobby.pendingRoll !== null) {
        socket.emit('game:roll', lobby.pendingRoll);
    }
}
io.use((socket, next) => {
    const code = socket.handshake.auth.code?.toUpperCase();
    const playerId = socket.handshake.auth.playerId;
    if (!code || !playerId) {
        next(buildSocketError('invalid_session'));
        return;
    }
    const lobby = lobbies.get(code);
    if (!lobby) {
        next(buildSocketError('lobby_closed'));
        return;
    }
    if (!lobby.players.find((player) => player.id === playerId)) {
        next(buildSocketError('player_removed'));
        return;
    }
    socket.data.code = code;
    socket.data.playerId = playerId;
    next();
});
io.on('connection', (socket) => {
    const code = socket.data.code;
    const playerId = socket.data.playerId;
    const lobby = lobbies.get(code);
    if (!lobby) {
        return;
    }
    socket.join(code);
    emitCurrentSocketState(socket, lobby);
    socket.on('game:state:request', () => {
        const nextLobby = lobbies.get(code);
        if (!nextLobby) {
            socket.emit('lobby:closed');
            socket.disconnect();
            return;
        }
        if (!nextLobby.players.find((player) => player.id === playerId)) {
            socket.emit('lobby:player-removed', { playerId });
            socket.disconnect();
            return;
        }
        emitCurrentSocketState(socket, nextLobby);
    });
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
        lobby.players = parsedState.data.players.map((player) => ({ ...player }));
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
