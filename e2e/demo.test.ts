import { expect, test, type Page } from '@playwright/test';

type ExposedGameState = {
	players: { position: number }[];
	turn: number;
};

async function getExposedState(page: Page): Promise<ExposedGameState> {
	return page.evaluate(() => {
		return (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__!;
	});
}

test('can switch between single and multi-device setup modes', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Yksi laite' })).toBeVisible();
	await page.getByRole('button', { name: 'Moni laite' }).click();
	await expect(page.getByRole('heading', { name: 'Monilaite-tila' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Luo lobby' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Liity lobbyyn' })).toBeVisible();
});

test('shows lobby code validation in multi-device mode', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Moni laite' }).click();
	await page.locator('#multi-name').fill('Guest');
	await page.locator('#multi-code').fill('abc');
	await page.getByRole('button', { name: 'Liity lobbyyn' }).click();
	await expect(page.getByText('Koodin tulee olla 6 merkkiä pitkä')).toBeVisible();
});

test('plays multiplayer game to finish with synchronized movement on both screens', async ({ browser }) => {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1');
	await guestPage.goto('/?e2e=1');

	await hostPage.getByRole('button', { name: 'Moni laite' }).click();
	await hostPage.locator('#multi-name').fill('Host');
	await hostPage.getByRole('button', { name: 'Luo lobby' }).click();
	await expect(hostPage.locator('text=Koodi:')).toBeVisible();
	const code = (await hostPage.locator('text=Koodi:').innerText()).split(':').at(-1)?.trim();
	expect(code).toBeTruthy();

	await guestPage.getByRole('button', { name: 'Moni laite' }).click();
	await guestPage.locator('#multi-name').fill('Guest');
	await guestPage.locator('#multi-code').fill(code!);
	await guestPage.getByRole('button', { name: 'Liity lobbyyn' }).click();

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 10_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpelissä' }).click();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await guestPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	let finished = false;
	for (let i = 0; i < 30; i++) {
		const previous = await getExposedState(hostPage);
		await hostPage.getByRole('button', { name: 'Seuraava vuoro' }).click();

		await expect
			.poll(async () => (await getExposedState(hostPage)).turn, { timeout: 5_000 })
			.toBe(previous.turn + 1);

		const hostState = await getExposedState(hostPage);
		await expect
			.poll(async () => (await getExposedState(guestPage)).turn, { timeout: 5_000 })
			.toBe(hostState.turn);
		const guestState = await getExposedState(guestPage);
		expect(guestState.players.map((p) => p.position)).toEqual(
			hostState.players.map((p) => p.position)
		);

		if (hostState.players.every((player) => player.position >= 55)) {
			finished = true;
			break;
		}
	}

	expect(finished).toBeTruthy();
	await expect(hostPage.getByRole('button', { name: 'Takaisin aloitusnäyttöön' })).toBeVisible();
	await expect(guestPage.getByRole('button', { name: 'Takaisin aloitusnäyttöön' })).toBeVisible();

	await hostContext.close();
	await guestContext.close();
});
