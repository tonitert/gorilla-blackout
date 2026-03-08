export function normalizeLobbyCode(code: string): string {
	return code.trim().toUpperCase();
}

export function isValidLobbyCode(code: string): boolean {
	return /^[A-Z0-9]{6}$/.test(normalizeLobbyCode(code));
}
