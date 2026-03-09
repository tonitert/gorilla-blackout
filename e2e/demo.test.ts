import { expect, test, type Page } from '@playwright/test';

type ExposedGameState = {
	players: { id?: string; name?: string; position: number }[];
	turn: number;
	phase: 'idle' | 'rolling' | 'tile';
	activeTilePosition: number | null;
	currentTurnPlayerId?: string | null;
	diceValue?: number | null;
};

async function getExposedState(page: Page): Promise<ExposedGameState> {
	return page.evaluate(() => {
		return (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__!;
	});
}

async function getExposedRoll(page: Page): Promise<number | null | undefined> {
	return page.evaluate(() => {
		return (window as Window & { __GB_ROLL__?: number | null }).__GB_ROLL__;
	});
}

async function getVisibleDieNumber(page: Page): Promise<number | null> {
	const alt = await page.locator('img.dice').first().getAttribute('alt');
	if (!alt) return null;
	const match = alt.match(/(\d+)/);
	return match ? Number(match[1]) : null;
}

async function openCharacterPicker(page: Page) {
	await page.getByRole('button', { name: 'Valitse pelihahmo' }).click();
}

async function createLobbyAndReadCode(page: Page): Promise<string> {
	const createResponse = page.waitForResponse(
		(response) =>
			response.url().endsWith('/api/lobbies') &&
			response.request().method() === 'POST' &&
			response.status() === 200
	);
	await page.getByRole('button', { name: 'Luo peli' }).click();
	await createResponse;
	await expect(page.locator('text=Koodi:')).toBeVisible({ timeout: 15_000 });
	const code = (await page.locator('text=Koodi:').innerText()).split(':').at(-1)?.trim();
	expect(code).toBeTruthy();
	return code!;
}

async function joinLobbyWithCode(page: Page, code: string) {
	const joinResponse = page.waitForResponse(
		(response) =>
			response.url().includes(`/api/lobbies/${code}/join`) &&
			response.request().method() === 'POST' &&
			response.status() === 200
	);
	await page.locator('#multi-code').fill(code);
	await page.getByTestId('join-lobby-submit').click();
	await joinResponse;
}

function characterToggle(page: Page, character: string) {
	return page
		.locator('button')
		.filter({ has: page.getByText(character, { exact: true }) })
		.first();
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
	await page.getByTestId('join-lobby-submit').click();
	await expect(page.getByText('Koodin tulee olla 6 merkkiä pitkä')).toBeVisible();
});

test('does not auto-enter previous game after refresh', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Aloita peli' }).scrollIntoViewIfNeeded();
	await page.getByLabel('Nimi').nth(0).fill('Tester 1');
	await page.getByLabel('Nimi').nth(1).fill('Tester 2');
	await page.getByRole('button', { name: 'Aloita peli' }).click();
	await expect(page.locator('.game')).toBeVisible();

	await page.reload();

	await expect(page.locator('.game')).toHaveCount(0);
	await expect(page.getByText('Aikaisempi peli löytyi. Haluatko jatkaa?')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Aloita peli' })).toBeVisible();
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
	const code = await createLobbyAndReadCode(hostPage);

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);

	await openCharacterPicker(hostPage);
	await characterToggle(hostPage, 'Kalja').click();
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(guestPage.getByText('Host')).toBeVisible({ timeout: 15_000 });

	await openCharacterPicker(guestPage);
	await expect(characterToggle(guestPage, 'Kalja')).toBeDisabled();

	await hostContext.close();
	await guestContext.close();
});

test('keeps deterministic multiplayer turns synchronized on both screens', async ({ browser }) => {
	test.setTimeout(90_000);

	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1');
	await guestPage.goto('/?e2e=1');

	await hostPage.getByRole('button', { name: 'Moninpeli' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await guestPage.getByLabel('Nimi').first().fill('Guest');
	await guestPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 15_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await guestPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	const initialState = await getExposedState(hostPage);
	expect(initialState.players.length).toBeGreaterThanOrEqual(2);
	const hostPlayerId = initialState.players.find((player) => player.name === 'Host')?.id;
	const guestPlayerId = initialState.players.find((player) => player.name === 'Guest')?.id;
	expect(hostPlayerId).toBeTruthy();
	expect(guestPlayerId).toBeTruthy();

	for (let i = 0; i < 90; i++) {
		const previous = await getExposedState(hostPage);
		const actorPage = previous.currentTurnPlayerId === guestPlayerId ? guestPage : hostPage;
		await actorPage.evaluate(() => {
			(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
		});

		const hostState = await getExposedState(hostPage);
		await expect
			.poll(
				async () => {
					const nextHostState = await getExposedState(hostPage);
					const nextGuestState = await getExposedState(guestPage);
					return (
						JSON.stringify(nextGuestState.players.map((p) => p.position)) ===
						JSON.stringify(nextHostState.players.map((p) => p.position))
					);
				},
				{ timeout: 6_000 }
			)
			.toBe(true);
		if (hostState.players.every((player) => player.position >= 55)) {
			break;
		}
	}

	const finalHostState = await getExposedState(hostPage);
	const finalGuestState = await getExposedState(guestPage);
	expect(finalGuestState.players.map((p) => p.position)).toEqual(
		finalHostState.players.map((p) => p.position)
	);

	await hostContext.close();
	await guestContext.close();
});

test('keeps multiplayer movement synchronized with random dice throws', async ({ browser }) => {
	test.setTimeout(120_000);

	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1&randomDice=1');
	await guestPage.goto('/?e2e=1&randomDice=1');

	await hostPage.getByRole('button', { name: 'Moninpeli' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await guestPage.getByLabel('Nimi').first().fill('Guest');
	await guestPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 15_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await guestPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	let movesChecked = 0;
	for (let i = 0; i < 18; i++) {
		const before = await getExposedState(hostPage);
		const actorPage =
			before.currentTurnPlayerId === before.players.find((p) => p.name === 'Guest')?.id
				? guestPage
				: hostPage;
		await actorPage.evaluate(() => {
			(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
		});

		await expect
			.poll(
				async () => {
					const hostRoll = await getExposedRoll(hostPage);
					const guestRoll = await getExposedRoll(guestPage);
					return hostRoll !== null && hostRoll !== undefined && hostRoll === guestRoll;
				},
				{ timeout: 8_000 }
			)
			.toBe(true);

		const hostRoll = await getExposedRoll(hostPage);
		expect(hostRoll).toBeGreaterThanOrEqual(1);
		expect(hostRoll).toBeLessThanOrEqual(6);

		await expect
			.poll(
				async () => {
					const hs = await getExposedState(hostPage);
					const gs = await getExposedState(guestPage);
					return (
						JSON.stringify(hs.players.map((p) => p.position)) ===
						JSON.stringify(gs.players.map((p) => p.position))
					);
				},
				{ timeout: 8_000 }
			)
			.toBe(true);
		movesChecked += 1;
	}

	expect(movesChecked).toBe(18);

	await hostContext.close();
	await guestContext.close();
});

test('shows the same dice value on screen as server-calculated roll', async ({ browser }) => {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1&randomDice=1');
	await guestPage.goto('/?e2e=1&randomDice=1');

	await hostPage.getByRole('button', { name: 'Moninpeli' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await hostPage.getByLabel('Nimi').first().fill('Host');
	await hostPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await guestPage.getByLabel('Nimi').first().fill('Guest');
	await guestPage.getByRole('button', { name: 'Tallenna pelaaja' }).click();

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 15_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await guestPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect.poll(async () => await getExposedRoll(hostPage), { timeout: 8_000 }).not.toBeNull();

	await expect
		.poll(
			async () => {
				const hostDie = await getVisibleDieNumber(hostPage);
				const roll = await getExposedRoll(hostPage);
				return hostDie !== null && roll !== null && hostDie === roll;
			},
			{ timeout: 8_000 }
		)
		.toBe(true);

	await hostContext.close();
	await guestContext.close();
});
