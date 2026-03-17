import type { MultiplayerResumeAvailability } from '$lib/multiplayer/client';

export function getResumeAvailabilityRefreshDelayMs(options: {
	resumeAvailabilityCheckCount: number;
	loadingMultiplayerResume: boolean;
	multiplayerResumeAvailability: MultiplayerResumeAvailability;
}): number | null {
	const { resumeAvailabilityCheckCount, loadingMultiplayerResume, multiplayerResumeAvailability } =
		options;

	if (loadingMultiplayerResume) {
		return null;
	}

	if (multiplayerResumeAvailability.status === 'available') {
		return null;
	}

	if (resumeAvailabilityCheckCount === 0) {
		return 0;
	}

	if (!multiplayerResumeAvailability.session && resumeAvailabilityCheckCount >= 2) {
		return null;
	}

	return 3_000;
}
