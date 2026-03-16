import type { MultiplayerResumeAvailability } from '$lib/multiplayer/client';

export function getResumeAvailabilityRefreshDelayMs(options: {
	checkedMultiplayerResume: boolean;
	loadingMultiplayerResume: boolean;
	multiplayerResumeAvailability: MultiplayerResumeAvailability;
}): number | null {
	const { checkedMultiplayerResume, loadingMultiplayerResume, multiplayerResumeAvailability } =
		options;

	if (loadingMultiplayerResume) {
		return null;
	}

	if (multiplayerResumeAvailability.status === 'available') {
		return null;
	}

	if (checkedMultiplayerResume && !multiplayerResumeAvailability.session) {
		return null;
	}

	return checkedMultiplayerResume ? 3_000 : 0;
}
