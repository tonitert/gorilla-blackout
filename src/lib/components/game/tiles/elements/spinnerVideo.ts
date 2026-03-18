const haveCurrentData = 2;
const introReadyTimeoutMs = 3_000;

type SpinnerIntroVideo = {
	addEventListener: (type: string, listener: () => void) => void;
	currentTime: number;
	load: () => void;
	muted: boolean;
	play: () => Promise<void>;
	readyState: number;
	removeEventListener: (type: string, listener: () => void) => void;
	volume: number;
};

async function waitForSpinnerIntroData(video: SpinnerIntroVideo): Promise<boolean> {
	if (video.readyState >= haveCurrentData) {
		return true;
	}

	return await new Promise<boolean>((resolve) => {
		let settled = false;

		const cleanup = (result: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			video.removeEventListener('loadeddata', onReady);
			video.removeEventListener('canplay', onReady);
			video.removeEventListener('error', onFailure);
			resolve(result);
		};

		const onReady = () => {
			cleanup(true);
		};
		const onFailure = () => {
			cleanup(false);
		};
		const timeoutId = setTimeout(() => {
			cleanup(video.readyState >= haveCurrentData);
		}, introReadyTimeoutMs);

		video.addEventListener('loadeddata', onReady);
		video.addEventListener('canplay', onReady);
		video.addEventListener('error', onFailure);
		video.load();
	});
}

export async function playSpinnerIntroWithSound(
	video: SpinnerIntroVideo
): Promise<boolean> {
	video.currentTime = 0;
	video.muted = false;
	video.volume = 1;

	try {
		const ready = await waitForSpinnerIntroData(video);

		if (!ready) {
			return false;
		}

		await video.play();
		return true;
	} catch {
		return false;
	}
}
