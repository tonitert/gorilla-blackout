import { expect, test, type Page } from '@playwright/test';

type ExposedGameState = {
	players: { id?: string; name?: string; position: number }[];
	turn: number;
	phase: 'idle' | 'rolling' | 'tile';
	activeTilePosition: number | null;
	currentTurnPlayerId?: string | null;
	diceValue?: number | null;
	tileState?: Record<string, unknown> | null;
};

const unskippableTilePositions = new Set([32, 54, 55]);

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

function getExpectedLandingPosition(startPosition: number, roll: number): number {
	let endPosition = Math.min(startPosition + roll, 55);
	for (let step = 1; step <= roll; step++) {
		const tilePosition = startPosition + step;
		if (unskippableTilePositions.has(tilePosition)) {
			endPosition = tilePosition;
			break;
		}
	}
	return endPosition;
}

async function savePlayerName(page: Page, name: string) {
	await page.getByLabel('Nimi').first().fill(name);
	await page.getByLabel('Nimi').first().blur();
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
	await expect(page.locator('text=Koodi:')).toBeVisible({ timeout: 30_000 });
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

test('single-device deterministic turns still advance players correctly', async ({ page }) => {
	await page.goto('/?e2e=1');
	await page.getByLabel('Nimi').nth(0).fill('Alpha');
	await page.getByLabel('Nimi').nth(1).fill('Beta');
	await page.getByRole('button', { name: 'Aloita peli' }).click();

	await expect(page.locator('.game')).toBeVisible();

	const initialState = await getExposedState(page);
	expect(initialState.players.map((player) => player.position)).toEqual([0, 0]);

	await page.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect
		.poll(async () => {
			const nextState = await getExposedState(page);
			return {
				positions: nextState.players.map((player) => player.position),
				currentTurnPlayerId: nextState.currentTurnPlayerId,
				phase: nextState.phase
			};
		})
		.toEqual({
			positions: [6, 0],
			currentTurnPlayerId: initialState.players[1].id ?? null,
			phase: 'idle'
		});
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
	await savePlayerName(hostPage, 'Host');

	await expect(guestPage.getByText('Host')).toBeVisible({ timeout: 30_000 });

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
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

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
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

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
		const actorId = before.currentTurnPlayerId;
		const actorIndex = before.players.findIndex((player) => player.id === actorId);
		expect(actorIndex).toBeGreaterThanOrEqual(0);
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

		const expectedPosition = getExpectedLandingPosition(
			before.players[actorIndex].position,
			hostRoll!
		);

		await expect
			.poll(
				async () => {
					const hs = await getExposedState(hostPage);
					const gs = await getExposedState(guestPage);
					const positionsMatch =
						JSON.stringify(hs.players.map((p) => p.position)) ===
						JSON.stringify(gs.players.map((p) => p.position));
					return positionsMatch && hs.players[actorIndex].position === expectedPosition;
				},
				{ timeout: 8_000 }
			)
			.toBe(true);

		const syncedHostState = await getExposedState(hostPage);
		expect(syncedHostState.players[actorIndex].position).toBe(expectedPosition);
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
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

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

	const hostRoll = await getExposedRoll(hostPage);
	await hostPage.waitForTimeout(900);
	expect(await getVisibleDieNumber(hostPage)).toBe(hostRoll);

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

	await expect
		.poll(
			async () => {
				const guestDie = await getVisibleDieNumber(guestPage);
				const roll = await getExposedRoll(guestPage);
				return guestDie !== null && roll !== null && guestDie === roll;
			},
			{ timeout: 8_000 }
		)
		.toBe(true);

	await hostContext.close();
	await guestContext.close();
});

test('non-host sees waiting message and host does not', async ({ browser }) => {
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

	await expect(guestPage.getByText('Odotetaan pelin alkamista..')).toBeVisible({ timeout: 10_000 });
	await expect(hostPage.getByText('Odotetaan pelin alkamista..')).toHaveCount(0);
	await expect(hostPage.getByRole('button', { name: 'Aloita moninpeli' })).toBeVisible();

	await hostContext.close();
	await guestContext.close();
});

test('character selection auto-saves without Tallenna button', async ({ browser }) => {
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

	// No "Tallenna pelaaja" button should exist
	await expect(hostPage.getByRole('button', { name: 'Tallenna pelaaja' })).toHaveCount(0);
	await expect(guestPage.getByRole('button', { name: 'Tallenna pelaaja' })).toHaveCount(0);

	// Selecting a character on host should auto-save and propagate to guest
	await openCharacterPicker(hostPage);
	await characterToggle(hostPage, 'Kalja').click();

	// Guest's character picker should show Kalja as disabled (already taken by host)
	await openCharacterPicker(guestPage);
	await expect(characterToggle(guestPage, 'Kalja')).toBeDisabled({ timeout: 10_000 });

	// Name saved on blur propagates too
	await savePlayerName(hostPage, 'HostAuto');
	await expect(guestPage.getByText('HostAuto')).toBeVisible({ timeout: 10_000 });

	await hostContext.close();
	await guestContext.close();
});

test('tileState syncs across multiplayer players when on a tile', async ({ browser }) => {
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
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

	await hostPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);
	await guestPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	const initialState = await getExposedState(hostPage);
	const hostPlayerId = initialState.players.find((p) => p.name === 'Host')?.id;

	// Inject tileState without activeTilePosition — no Spinner mounts to override it.
	// This tests the pure tileState sync channel through WebSocket.
	await hostPage.evaluate(
		({ hostId }) => {
			(
				window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
			).__GB_INJECT_STATE__?.({
				turnInProgress: true,
				turnOwnerId: hostId,
				tileState: { spin_0_stage: 'waitingForSpin', spin_0_result: 2.5 }
			});
		},
		{ hostId: hostPlayerId }
	);

	// Guest should receive the same tileState via WebSocket sync
	await expect
		.poll(
			async () => {
				const gs = await getExposedState(guestPage);
				return (
					gs.tileState?.['spin_0_stage'] === 'waitingForSpin' &&
					gs.tileState?.['spin_0_result'] === 2.5
				);
			},
			{ timeout: 8_000 }
		)
		.toBe(true);

	// Update tileState stage to 'spinning'
	await hostPage.evaluate(
		({ hostId }) => {
			(
				window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
			).__GB_INJECT_STATE__?.({
				turnInProgress: true,
				turnOwnerId: hostId,
				tileState: { spin_0_stage: 'spinning', spin_0_result: 2.5 }
			});
		},
		{ hostId: hostPlayerId }
	);

	await expect
		.poll(async () => (await getExposedState(guestPage)).tileState?.['spin_0_stage'], {
			timeout: 8_000
		})
		.toBe('spinning');

	await hostContext.close();
	await guestContext.close();
});

test('guest sees the nested 50/50 spinner when the host updates its stage', async ({ browser }) => {
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
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Moninpeli' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await expect(hostPage.getByText('Guest')).toBeVisible({ timeout: 30_000 });
	await hostPage.getByRole('button', { name: 'Aloita moninpeli' }).click();

	await hostPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);
	await guestPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	expect((await getExposedState(hostPage)).players.length).toBeGreaterThanOrEqual(2);

	await hostPage.evaluate(() => {
		(
			window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.({
			currentTurnPlayerId: 'external-test-player',
			turnInProgress: true,
			turnOwnerId: 'external-test-player',
			phase: 'tile',
			activeTilePosition: 14,
			tileState: {
				spin_0_stage: 'result',
				spin_0_result: 3.25
			}
		});
	});

	await expect
		.poll(
			async () => {
				const guestState = await getExposedState(guestPage);
				return (
					guestState.currentTurnPlayerId === 'external-test-player' &&
					guestState.activeTilePosition === 14 &&
					guestState.tileState?.['spin_0_stage'] === 'result'
				);
			},
			{ timeout: 8_000 }
		)
		.toBe(true);

	await expect
		.poll(
			async () =>
				await guestPage.evaluate(() => document.querySelectorAll('img[alt="Raju Osoitin"]').length),
			{
				timeout: 8_000
			}
		)
		.toBe(1);

	await hostPage.evaluate(() => {
		(
			window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.({
			currentTurnPlayerId: 'external-test-player',
			turnInProgress: true,
			turnOwnerId: 'external-test-player',
			phase: 'tile',
			activeTilePosition: 14,
			tileState: {
				spin_0_stage: 'result',
				spin_0_result: 3.25,
				spin_1_stage: 'waitingForSpin',
				spin_1_result: 0.5
			}
		});
	});

	await expect
		.poll(
			async () =>
				await guestPage.evaluate(() => document.querySelectorAll('img[alt="Raju Osoitin"]').length),
			{
				timeout: 20_000
			}
		)
		.toBe(2);

	await hostContext.close();
	await guestContext.close();
});
