import { WebSocketServer, WebSocket } from 'ws';
import { LobbyManager } from './lobbyManager.js';
export interface ClientConnection {
    ws: WebSocket;
    playerId: string;
    lobbyId: string | null;
}
export declare class WebSocketManager {
    private wss;
    private clients;
    private lobbyManager;
    constructor(wss: WebSocketServer, lobbyManager: LobbyManager);
    private setupWebSocketServer;
    private handleMessage;
    private handleCreateLobby;
    private handleJoinLobby;
    private handleLeaveLobby;
    private handleStartGame;
    private handleUpdateGameState;
    private handleDisconnect;
    private sendMessage;
    private sendError;
    private broadcastToLobby;
}
//# sourceMappingURL=websocketManager.d.ts.map