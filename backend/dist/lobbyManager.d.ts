import type { Lobby, Player, GameState } from './types.js';
export declare class LobbyManager {
    private lobbies;
    private lobbyCodeToId;
    generateLobbyCode(): string;
    createLobby(hostPlayer: Player): Lobby;
    getLobbyByCode(code: string): Lobby | undefined;
    getLobbyById(lobbyId: string): Lobby | undefined;
    addPlayerToLobby(lobbyId: string, player: Player): boolean;
    removePlayerFromLobby(lobbyId: string, playerId: string): boolean;
    updateGameState(lobbyId: string, gameState: GameState): boolean;
    deleteLobby(lobbyId: string): void;
    cleanupOldLobbies(): void;
}
//# sourceMappingURL=lobbyManager.d.ts.map