import { expect, test, type Page } from '@playwright/test';

type ExposedGameState = {
	players: { position: number }[];
	turn: number;
	phase: 'idle' | 'rolling' | 'tile';
	activeTilePosition: number | null;
};

async function getExposedState(page: Page): Promise<ExposedGameState> {
	return page.evaluate(() => {
		return (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__!;
	});
}

async function openCharacterPicker(page: Page) {
	await page.getByRole('button', { name: 'Valitse pelihahmo' }).click();
}

function characterToggle(page: Page, character: string) {
	return page.locator('button').filter({ has: page.getByText(character, { exact: true }) }).first();
}

test('can switch between single and multiplayer setup modes', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Yksi laite' })).toBeVisible();
	await page.getByRole('button', { name: 'Moninpeli' }).click();
	await expect(page.getByRole('heading', { name: 'Moninpeli' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Hostaa peli' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Liity peliin' })).toBeVisible();
});

test('join flow asks for code only after selecting join mode', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Moninpeli' }).click();
	await expect(page.locator('#multi-code')).toHaveCount(0);
	await page.getByRole('button', { name: 'Liity peliin' }).click();
	await expect(page.locator('#multi-code')).toBeVisible();
	await page.locator('#multi-code').fill('abc');
	await page.getByRole('button', { name: 'Liity peliin' }).nth(1).click();
	await expect(page.getByText('Koodin tulee olla 6 merkkiä pitkä')).toBeVisible();
});

test('multiplayer enforces unique character selection across sessions', async ({ browser }) => {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/');
	await guestPage.goto('/');

	await hostPage.getByRole('button', { name: 'Moninpeli' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	await hostPage.getByRole('button', { name: 'Luo peli' }).click();
	const code = (await hostPage.locator('text=Koodi:').innerText()).split(':').at(-1)?.trim();
	expect(code).toBeTruthy();

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await guestPage.locator('#multi-code').fill(code!);
	await guestPage.getByRole('button', { name: 'Liity peliin' }).nth(1).click();

	await openCharacterPicker(hostPage);
	await characterToggle(hostPage, 'Kalja').click();
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(guestPage.getByText('Host')).toBeVisible({ timeout: 10_000 });

	await openCharacterPicker(guestPage);
	await expect(characterToggle(guestPage, 'Kalja')).toBeDisabled();

	await hostContext.close();
	await guestContext.close();
});

test('plays multiplayer game to finish with synchronized dice/tile progression on both screens', async ({
	browser
}) => {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1');
	await guestPage.goto('/?e2e=1');

	await hostPage.getByRole('button', { name: 'Moninpeli' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	await hostPage.getByRole('button', { name: 'Luo peli' }).click();
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();
	await expect(hostPage.locator('text=Koodi:')).toBeVisible();
	const code = (await hostPage.locator('text=Koodi:').innerText()).split(':').at(-1)?.trim();
	expect(code).toBeTruthy();

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await guestPage.locator('#multi-code').fill(code!);
	await guestPage.getByRole('button', { name: 'Liity peliin' }).nth(1).click();
	await guestPage.getByLabel('Nimi').first().fill('Guest');
	await guestPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 10_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

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
		const buttonName = previous.activeTilePosition !== null ? /Sulje|Jatka|Seuraava/i : 'Seuraava vuoro';
		await hostPage.getByRole('button', { name: buttonName }).first().click();

		if (previous.phase === 'idle') {
			await expect(hostPage.locator('img.dice')).toBeVisible();
			await expect(guestPage.locator('img.dice')).toBeVisible();
		}

		await expect
			.poll(async () => (await getExposedState(hostPage)).turn, { timeout: 6_000 })
			.toBeGreaterThanOrEqual(previous.turn);

		const hostState = await getExposedState(hostPage);
		await expect
			.poll(async () => (await getExposedState(guestPage)).turn, { timeout: 6_000 })
			.toBe(hostState.turn);
		const guestState = await getExposedState(guestPage);
		expect(guestState.players.map((p) => p.position)).toEqual(
			hostState.players.map((p) => p.position)
		);
		expect(guestState.activeTilePosition).toBe(hostState.activeTilePosition);

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
