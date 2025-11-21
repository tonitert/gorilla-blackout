export var MessageType;
(function (MessageType) {
    // Lobby messages
    MessageType["CREATE_LOBBY"] = "CREATE_LOBBY";
    MessageType["JOIN_LOBBY"] = "JOIN_LOBBY";
    MessageType["LEAVE_LOBBY"] = "LEAVE_LOBBY";
    MessageType["LOBBY_CREATED"] = "LOBBY_CREATED";
    MessageType["LOBBY_JOINED"] = "LOBBY_JOINED";
    MessageType["PLAYER_JOINED"] = "PLAYER_JOINED";
    MessageType["PLAYER_LEFT"] = "PLAYER_LEFT";
    // Game messages
    MessageType["START_GAME"] = "START_GAME";
    MessageType["GAME_STARTED"] = "GAME_STARTED";
    MessageType["UPDATE_GAME_STATE"] = "UPDATE_GAME_STATE";
    MessageType["GAME_STATE_UPDATED"] = "GAME_STATE_UPDATED";
    // Error messages
    MessageType["ERROR"] = "ERROR";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=types.js.map