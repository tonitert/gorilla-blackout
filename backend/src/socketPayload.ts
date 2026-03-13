import { z } from 'zod';

export const gamePlayerSchema = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string(),
	position: z.number().int().nonnegative()
});

export const gameStateSchema = z.object({
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

export const gameStateUpdateSchema = z.object({
	actorId: z.string(),
	state: gameStateSchema
});

export const gameRollRequestSchema = z.object({
	actorId: z.string()
});

export type GameState = z.infer<typeof gameStateSchema>;
