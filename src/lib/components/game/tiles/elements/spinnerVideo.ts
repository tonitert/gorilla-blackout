export async function playSpinnerIntroWithSound(
	video: Pick<HTMLMediaElement, 'muted' | 'volume' | 'play'>
): Promise<boolean> {
	video.muted = false;
	video.volume = 1;

	try {
		await video.play();
		return true;
	} catch {
		return false;
	}
}
