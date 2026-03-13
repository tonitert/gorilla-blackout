import { expect, test, type Page } from '@playwright/test';

type ExposedGameState = {
	players: { id?: string; name?: string; image?: string; position: number }[];
	turn: number;
	phase: 'idle' | 'rolling' | 'tile';
	activeTilePosition: number | null;
	activeTileTrigger?: 'landing' | 'moveStart' | null;
	activeTileSessionId?: number;
	currentTurnPlayerId?: string | null;
	turnOwnerId?: string | null;
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
	const saveResponse = page.waitForResponse(
		(response) =>
			response.url().includes('/api/lobbies/') &&
			response.url().endsWith('/player') &&
			response.request().method() === 'POST' &&
			response.status() === 200
	);
	await page.getByLabel('Nimi').first().fill(name);
	await page.getByLabel('Nimi').first().blur();
	await saveResponse;
}

async function startSingleDeviceGame(page: Page, url = '/?e2e=1') {
	await page.goto(url);
	await page.getByLabel('Nimi').nth(0).fill('Alpha');
	await page.getByLabel('Nimi').nth(1).fill('Beta');
	await page.getByRole('button', { name: 'Aloita peli' }).click();
	await expect(page.locator('.game')).toBeVisible({ timeout: 15_000 });
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

async function injectGameState(page: Page, partial: Record<string, unknown>) {
	await page.evaluate((statePatch) => {
		(
			window as Window & { __GB_INJECT_STATE__?: (partial: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.(statePatch);
	}, partial);
}

async function startMultiplayerGameInBrowser(
	browser: import('@playwright/test').Browser,
	url: string
) {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto(url);
	await guestPage.goto(url);

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');
	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});
	await guestPage.evaluate(() => {
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.();
	});

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	let hostPlayerId: string | null = null;
	let guestPlayerId: string | null = null;

	await expect
		.poll(
			async () => {
				const state = await getExposedState(hostPage);
				hostPlayerId = state.players.find((player) => player.name === 'Host')?.id ?? null;
				guestPlayerId = state.players.find((player) => player.name === 'Guest')?.id ?? null;

				return Boolean(hostPlayerId && guestPlayerId);
			},
			{ timeout: 15_000 }
		)
		.toBe(true);

	return {
		hostContext,
		guestContext,
		hostPage,
		guestPage,
		code,
		hostPlayerId,
		guestPlayerId
	};
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
	await page.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await expect(page.getByRole('heading', { name: 'Monen laitteen peli (Beta)' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Hostaa peli' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Liity peliin' })).toBeVisible();
});

test('rejoin helper stores join code and lets player join from front page after reload', async ({
	browser
}) => {
	test.setTimeout(90_000);

	const hostContext = await browser.newContext();
	const rejoinContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const rejoinPage = await rejoinContext.newPage();

	await hostPage.goto('/?e2e=1');
	await rejoinPage.goto('/?e2e=1');

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);

	await rejoinPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await rejoinPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(rejoinPage, code);
	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

	await rejoinPage.reload();
	await expect(
		rejoinPage.getByAltText('Gorilla Blackout - rankka juomapeli opiskelijoille!')
	).toBeVisible();
	await rejoinPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await expect(rejoinPage.getByTestId('rejoin-lobby')).toContainText(code);
	await rejoinPage.getByTestId('rejoin-lobby').click();
	await expect(rejoinPage.locator('#multi-code')).toHaveValue(code);
	await joinLobbyWithCode(rejoinPage, code);
	await expect(rejoinPage.getByText(`Koodi: ${code}`)).toBeVisible({ timeout: 15_000 });

	await hostContext.close();
	await rejoinContext.close();
});

test('join flow asks for code only after selecting join mode', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
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
	await startSingleDeviceGame(page);

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

test('starting a turn on a move-start tile opens that interaction for the current player', async ({
	page
}) => {
	await startSingleDeviceGame(page, '/?e2e=1&playTiles=1');

	const initialState = await getExposedState(page);
	const playerId = initialState.players[0].id;
	expect(playerId).toBeTruthy();

	await page.evaluate(
		({ playerId }) => {
			const target = window as Window & {
				__GB_STATE__?: ExposedGameState;
				__GB_INJECT_STATE__?: (partial: Record<string, unknown>) => void;
			};
			const current = target.__GB_STATE__!;
			target.__GB_INJECT_STATE__?.({
				players: current.players.map((player, index) =>
					index === 0 ? { ...player, position: 53 } : player
				),
				currentTurnPlayerId: playerId,
				turnInProgress: false,
				turnOwnerId: null,
				phase: 'idle',
				activeTilePosition: null,
				activeTileTrigger: null,
				activeTileSessionId: 0,
				diceValue: null,
				tileState: null
			});
		},
		{ playerId }
	);

	await page.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect
		.poll(async () => {
			const nextState = await getExposedState(page);
			return {
				activeTilePosition: nextState.activeTilePosition,
				activeTileTrigger: nextState.activeTileTrigger,
				turnOwnerId: nextState.turnOwnerId,
				phase: nextState.phase
			};
		})
		.toEqual({
			activeTilePosition: 53,
			activeTileTrigger: 'moveStart',
			turnOwnerId: playerId,
			phase: 'tile'
		});

	await expect(page.getByRole('button', { name: 'Heitä noppaa' })).toBeVisible();
});

test('dice rollback tiles reset their interaction state for each new tile session', async ({
	page
}) => {
	await startSingleDeviceGame(page, '/?e2e=1&playTiles=1');

	const initialState = await getExposedState(page);
	const playerId = initialState.players[0].id;
	expect(playerId).toBeTruthy();

	await page.evaluate(
		({ playerId }) => {
			const target = window as Window & {
				__GB_STATE__?: ExposedGameState;
				__GB_INJECT_STATE__?: (partial: Record<string, unknown>) => void;
			};
			const current = target.__GB_STATE__!;
			target.__GB_INJECT_STATE__?.({
				players: current.players.map((player, index) =>
					index === 0 ? { ...player, position: 13 } : player
				),
				currentTurnPlayerId: playerId,
				turnInProgress: true,
				turnOwnerId: playerId,
				phase: 'tile',
				activeTilePosition: 13,
				activeTileTrigger: 'landing',
				activeTileSessionId: 1,
				diceValue: null,
				tileState: null
			});
		},
		{ playerId }
	);

	await expect(page.getByRole('button', { name: 'Heitä noppaa' })).toBeVisible();

	await page.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect(page.getByRole('button', { name: 'Pyöritetään..' })).toBeVisible();

	await page.evaluate(
		({ playerId }) => {
			const target = window as Window & {
				__GB_STATE__?: ExposedGameState;
				__GB_INJECT_STATE__?: (partial: Record<string, unknown>) => void;
			};
			const current = target.__GB_STATE__!;
			target.__GB_INJECT_STATE__?.({
				players: current.players.map((player, index) =>
					index === 0 ? { ...player, position: 29 } : player
				),
				currentTurnPlayerId: playerId,
				turnInProgress: true,
				turnOwnerId: playerId,
				phase: 'tile',
				activeTilePosition: 29,
				activeTileTrigger: 'landing',
				activeTileSessionId: (current.activeTileSessionId ?? 0) + 1,
				diceValue: null,
				tileState: null
			});
		},
		{ playerId }
	);

	await expect(page.getByRole('button', { name: 'Heitä noppaa' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pyöritetään..' })).toHaveCount(0);

	await page.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect(page.getByRole('button', { name: 'Pyöritetään..' })).toBeVisible();
});

test('multiplayer enforces unique character selection across sessions', async ({ browser }) => {
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/');
	await guestPage.goto('/');

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);

	await openCharacterPicker(hostPage);
	await characterToggle(hostPage, 'Kalja').click();
	await savePlayerName(hostPage, 'Host');

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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

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
	const hostPlayerId = initialState.players[0]?.id;
	const guestPlayerId = initialState.players[1]?.id;
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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);

	await expect(guestPage.getByText('Odotetaan pelin alkamista..')).toBeVisible({ timeout: 10_000 });
	await expect(hostPage.getByText('Odotetaan pelin alkamista..')).toHaveCount(0);
	await expect(hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' })).toBeVisible();

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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
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

test('single-device player menu can quit the game', async ({ page }) => {
	await page.goto('/?e2e=1');
	await page.getByLabel('Nimi').nth(0).fill('Alpha');
	await page.getByLabel('Nimi').nth(1).fill('Beta');
	await page.getByRole('button', { name: 'Aloita peli' }).click();
	await expect(page.locator('.game')).toBeVisible({ timeout: 15_000 });

	await page.locator('button').filter({ hasText: 'Muokkaa pelaajia' }).last().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: 'Poistu pelistä' }).click();

	await expect(page.locator('.game')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Aloita peli' })).toBeVisible({ timeout: 15_000 });
});

test('single-device player menu supports rename, character change, and remove', async ({
	page
}) => {
	await page.goto('/?e2e=1');
	await page.getByLabel('Nimi').nth(0).fill('Alpha');
	await page.getByLabel('Nimi').nth(1).fill('Beta');
	await page.getByRole('button', { name: 'Lisää pelaaja' }).click();
	await page.getByLabel('Nimi').nth(2).fill('Gamma');
	await page.getByRole('button', { name: 'Aloita peli' }).click();
	await expect(page.locator('.game')).toBeVisible({ timeout: 15_000 });

	await page.locator('button').filter({ hasText: 'Muokkaa pelaajia' }).last().click();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.getByLabel('Nimi').first().fill('AlphaUpdated');
	await page.getByLabel('Nimi').first().blur();

	await page.getByRole('button', { name: 'Valitse pelihahmo' }).first().click();
	await characterToggle(page, 'Kalja').click();

	const beforeRemoveState = await getExposedState(page);
	expect(beforeRemoveState.players.length).toBe(3);

	await page.getByRole('button', { name: 'Poista' }).nth(1).click();
	await page.getByRole('button', { name: 'Tallenna' }).click();

	await expect
		.poll(async () => {
			const state = await getExposedState(page);
			return {
				playerCount: state.players.length,
				hasUpdatedName: state.players.some((player) => player.name === 'AlphaUpdated'),
				hasUpdatedImage: state.players.some((player) => player.image === 'Kalja')
			};
		})
		.toEqual({
			playerCount: 2,
			hasUpdatedName: true,
			hasUpdatedImage: true
		});
});

test('players can join an in-progress game from the invite link', async ({ browser }) => {
	test.setTimeout(90_000);

	const { hostContext, guestContext, hostPage, guestPage, code, hostPlayerId, guestPlayerId } =
		await startMultiplayerGameInBrowser(browser, '/?e2e=1');

	await hostPage.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect
		.poll(async () => {
			const hostState = await getExposedState(hostPage);
			const guestState = await getExposedState(guestPage);

			return {
				hostPositions: hostState.players.map((player) => player.position),
				guestPositions: guestState.players.map((player) => player.position),
				currentTurnPlayerId: hostState.currentTurnPlayerId,
				playerCount: hostState.players.length
			};
		})
		.toEqual({
			hostPositions: [6, 0],
			guestPositions: [6, 0],
			currentTurnPlayerId: guestPlayerId,
			playerCount: 2
		});

	await hostPage.locator('button').filter({ hasText: 'Muokkaa pelaajia' }).last().click();
	await expect(hostPage.getByText(code, { exact: false })).toBeVisible();
	const inviteQrCode = hostPage.locator(`img[alt="Liity peliin koodilla ${code}"]`);
	await expect(inviteQrCode).toBeVisible();
	await expect(inviteQrCode).toHaveAttribute('src', /^data:image\/png;base64,/);
	await hostPage.keyboard.press('Escape');

	const lateJoinerContext = await browser.newContext();
	const lateJoinerPage = await lateJoinerContext.newPage();
	await lateJoinerPage.goto(`/?e2e=1&join=${code}`);

	await expect(lateJoinerPage.locator('#multi-code')).toBeVisible();
	await expect(lateJoinerPage.locator('#multi-code')).toHaveValue(code);
	await joinLobbyWithCode(lateJoinerPage, code);
	const lateJoinerNextTurnButton = lateJoinerPage
		.locator('button')
		.filter({ hasText: 'Seuraava vuoro' })
		.first();

	let lateJoinerId: string | null = null;

	await expect
		.poll(async () => {
			const hostState = await getExposedState(hostPage);
			const guestState = await getExposedState(guestPage);
			lateJoinerId =
				hostState.players.find(
					(player) => player.id !== hostPlayerId && player.id !== guestPlayerId
				)?.id ?? null;

			return {
				hostCount: hostState.players.length,
				guestCount: guestState.players.length,
				lateJoinerPosition:
					hostState.players.find((player) => player.id === lateJoinerId)?.position ?? null,
				currentTurnPlayerId: hostState.currentTurnPlayerId
			};
		})
		.toEqual({
			hostCount: 3,
			guestCount: 3,
			lateJoinerPosition: 3,
			currentTurnPlayerId: guestPlayerId
		});
	await expect(lateJoinerNextTurnButton).toBeDisabled();

	await guestPage.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect
		.poll(async () => {
			const hostState = await getExposedState(hostPage);
			return hostState.currentTurnPlayerId;
		})
		.toBe(lateJoinerId);
	await expect(lateJoinerNextTurnButton).toBeEnabled();

	await hostContext.close();
	await guestContext.close();
	await lateJoinerContext.close();
});

test('tileState syncs across multiplayer players when on a tile', async ({ browser }) => {
	test.setTimeout(90_000);
	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1');
	await guestPage.goto('/?e2e=1');

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

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

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

	await hostPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);
	await guestPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	const hostState = await getExposedState(hostPage);
	expect(hostState.players.length).toBeGreaterThanOrEqual(2);
	const hostPlayerId = hostState.players.find((player) => player.name === 'Host')?.id;
	expect(hostPlayerId).toBeTruthy();

	await guestPage.evaluate((playerId) => {
		(
			window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.({
			currentTurnPlayerId: playerId,
			turnInProgress: true,
			turnOwnerId: playerId,
			phase: 'tile',
			activeTilePosition: 14,
			tileState: {
				spin_0_stage: 'result',
				spin_0_result: 3.25
			}
		});
	}, hostPlayerId!);

	await expect
		.poll(
			async () => {
				const guestState = await getExposedState(guestPage);
				return (
					guestState.currentTurnPlayerId === hostPlayerId &&
					guestState.activeTilePosition === 14 &&
					guestState.tileState?.['spin_0_stage'] === 'result'
				);
			},
			{ timeout: 8_000 }
		)
		.toBe(true);

	await guestPage.evaluate((playerId) => {
		(
			window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.({
			currentTurnPlayerId: playerId,
			turnInProgress: true,
			turnOwnerId: playerId,
			phase: 'tile',
			activeTilePosition: 14,
			activeTileSessionId: 1,
			tileState: {
				spin_0_stage: 'result',
				spin_0_result: 3.25,
				spin_1_stage: 'waitingForSpin',
				spin_1_result: 0.5
			}
		});
	}, hostPlayerId!);

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

test('multiplayer Raju wheel intro resolves on both screens without getting stuck', async ({
	browser
}) => {
	test.setTimeout(90_000);

	const hostContext = await browser.newContext();
	const guestContext = await browser.newContext();
	const hostPage = await hostContext.newPage();
	const guestPage = await guestContext.newPage();

	await hostPage.goto('/?e2e=1&playTiles=1');
	await guestPage.goto('/?e2e=1&playTiles=1');

	await hostPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await hostPage.getByRole('button', { name: 'Hostaa peli' }).click();
	const code = await createLobbyAndReadCode(hostPage);
	await savePlayerName(hostPage, 'Host');

	await guestPage.getByRole('button', { name: 'Monen laitteen peli (Beta)' }).click();
	await guestPage.getByRole('button', { name: 'Liity peliin' }).click();
	await joinLobbyWithCode(guestPage, code);
	await savePlayerName(guestPage, 'Guest');

	await hostPage.getByRole('button', { name: 'Aloita monen laitteen peli' }).click();

	await hostPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);
	await guestPage.evaluate(() =>
		(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__?.()
	);

	await expect(hostPage.locator('.game')).toBeVisible();
	await expect(guestPage.locator('.game')).toBeVisible();

	const hostState = await getExposedState(hostPage);
	const hostPlayerId = hostState.players.find((player) => player.name === 'Host')?.id;
	expect(hostPlayerId).toBeTruthy();

	await hostPage.evaluate((playerId) => {
		(
			window as Window & { __GB_INJECT_STATE__?: (p: Record<string, unknown>) => void }
		).__GB_INJECT_STATE__?.({
			currentTurnPlayerId: playerId,
			turnInProgress: true,
			turnOwnerId: playerId,
			phase: 'tile',
			activeTilePosition: 14,
			activeTileTrigger: 'landing',
			activeTileSessionId: 1,
			tileState: null
		});
	}, hostPlayerId!);

	await expect
		.poll(
			async () => {
				const hostSnapshot = await hostPage.evaluate(() => ({
					sessionId: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__
						?.activeTileSessionId,
					trigger: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__
						?.activeTileTrigger,
					stage: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__?.tileState?.[
						'spin_0_stage'
					]
				}));
				const guestSnapshot = await guestPage.evaluate(() => ({
					sessionId: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__
						?.activeTileSessionId,
					trigger: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__
						?.activeTileTrigger,
					stage: (window as Window & { __GB_STATE__?: ExposedGameState }).__GB_STATE__?.tileState?.[
						'spin_0_stage'
					]
				}));

				return { hostSnapshot, guestSnapshot };
			},
			{ timeout: 35_000 }
		)
		.toEqual({
			hostSnapshot: {
				sessionId: 1,
				trigger: 'landing',
				stage: 'waitingForSpin'
			},
			guestSnapshot: {
				sessionId: 1,
				trigger: 'landing',
				stage: 'waitingForSpin'
			}
		});

	await expect(
		hostPage.getByRole('button', { name: 'Pyöräytä pyörää', exact: true })
	).toBeVisible();
	await expect(
		guestPage.getByRole('button', { name: 'Pyöräytä pyörää', exact: true })
	).toBeVisible();

	await hostPage.evaluate(() => {
		(window as Window & { __GB_NEXT__?: () => void }).__GB_NEXT__?.();
	});

	await expect
		.poll(async () => (await getExposedState(guestPage)).tileState?.['spin_0_stage'], {
			timeout: 8_000
		})
		.toBe('spinning');

	await hostContext.close();
	await guestContext.close();
});

test('multiplayer dice rollback clears stale rolling state after moving onto a new tile', async ({
	browser
}) => {
	test.setTimeout(90_000);

	const { hostContext, guestContext, hostPage, guestPage, hostPlayerId } =
		await startMultiplayerGameInBrowser(browser, '/?e2e=1&playTiles=1');

	const currentState = await getExposedState(hostPage);

	await injectGameState(hostPage, {
		players: currentState.players.map((player, index) =>
			index === 0 ? { ...player, position: 13 } : player
		),
		currentTurnPlayerId: hostPlayerId,
		turnInProgress: true,
		turnOwnerId: hostPlayerId,
		phase: 'tile',
		activeTilePosition: 13,
		activeTileTrigger: 'landing',
		activeTileSessionId: 1,
		diceValue: null,
		tileState: { dice_stage: 'waitingForRoll', dice_rolls: [3] }
	});

	await expect(hostPage.getByRole('button', { name: 'Heitä noppaa', exact: true })).toBeVisible();
	await hostPage.evaluate(() => {
		(window as Window & { __GB_TILE_ACTION__?: () => void }).__GB_TILE_ACTION__?.();
	});

	await expect
		.poll(
			async () => {
				const hostState = await getExposedState(hostPage);
				const guestState = await getExposedState(guestPage);

				return {
					host: {
						position: hostState.players[0]?.position,
						activeTilePosition: hostState.activeTilePosition,
						sessionId: hostState.activeTileSessionId,
						button: await hostPage.getByRole('button', { name: 'Sulje' }).isVisible()
					},
					guest: {
						position: guestState.players[0]?.position,
						activeTilePosition: guestState.activeTilePosition,
						sessionId: guestState.activeTileSessionId,
						button: await guestPage.getByRole('button', { name: 'Sulje' }).isVisible()
					}
				};
			},
			{ timeout: 15_000 }
		)
		.toEqual({
			host: { position: 10, activeTilePosition: 10, sessionId: 2, button: true },
			guest: { position: 10, activeTilePosition: 10, sessionId: 2, button: true }
		});

	await expect(hostPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(0);
	await expect(guestPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(
		0
	);

	await hostContext.close();
	await guestContext.close();
});

test('multiplayer 35-back tile does not keep stale rolling actions after movement', async ({
	browser
}) => {
	test.setTimeout(90_000);

	const { hostContext, guestContext, hostPage, guestPage, hostPlayerId } =
		await startMultiplayerGameInBrowser(browser, '/?e2e=1&playTiles=1');

	const currentState = await getExposedState(hostPage);

	await injectGameState(hostPage, {
		players: currentState.players.map((player, index) =>
			index === 0 ? { ...player, position: 53 } : player
		),
		currentTurnPlayerId: hostPlayerId,
		turnInProgress: true,
		turnOwnerId: hostPlayerId,
		phase: 'tile',
		activeTilePosition: 53,
		activeTileTrigger: 'landing',
		activeTileSessionId: 5,
		diceValue: null,
		tileState: { dice_stage: 'waitingForRoll', dice_rolls: [6, 6] }
	});

	await expect(hostPage.getByRole('button', { name: 'Heitä noppaa', exact: true })).toBeVisible();
	await hostPage.evaluate(() => {
		(window as Window & { __GB_TILE_ACTION__?: () => void }).__GB_TILE_ACTION__?.();
	});

	await expect
		.poll(
			async () => {
				const hostState = await getExposedState(hostPage);
				const guestState = await getExposedState(guestPage);

				return {
					host: {
						position: hostState.players[0]?.position,
						activeTilePosition: hostState.activeTilePosition,
						sessionId: hostState.activeTileSessionId
					},
					guest: {
						position: guestState.players[0]?.position,
						activeTilePosition: guestState.activeTilePosition,
						sessionId: guestState.activeTileSessionId
					}
				};
			},
			{ timeout: 15_000 }
		)
		.toEqual({
			host: { position: 18, activeTilePosition: 18, sessionId: 6 },
			guest: { position: 18, activeTilePosition: 18, sessionId: 6 }
		});

	await expect(hostPage.getByRole('button', { name: 'Sulje', exact: true })).toBeVisible();
	await expect(guestPage.getByRole('button', { name: 'Sulje', exact: true })).toBeVisible();
	await expect(hostPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(0);
	await expect(guestPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(
		0
	);

	await hostContext.close();
	await guestContext.close();
});

test('multiplayer six-to-win failure clears rolling state and leaves the tile closable', async ({
	browser
}) => {
	test.setTimeout(90_000);

	const { hostContext, guestContext, hostPage, guestPage, hostPlayerId, guestPlayerId } =
		await startMultiplayerGameInBrowser(browser, '/?e2e=1&playTiles=1');

	const currentState = await getExposedState(hostPage);

	await injectGameState(hostPage, {
		players: currentState.players.map((player, index) =>
			index === 0 ? { ...player, position: 54 } : player
		),
		currentTurnPlayerId: hostPlayerId,
		turnInProgress: true,
		turnOwnerId: hostPlayerId,
		phase: 'tile',
		activeTilePosition: 54,
		activeTileTrigger: 'landing',
		activeTileSessionId: 9,
		diceValue: null,
		tileState: { dice_stage: 'waitingForRoll', dice_rolls: [5] }
	});

	await expect(hostPage.getByRole('button', { name: 'Heitä noppaa', exact: true })).toBeVisible();
	await hostPage.evaluate(() => {
		(window as Window & { __GB_TILE_ACTION__?: () => void }).__GB_TILE_ACTION__?.();
	});

	await expect
		.poll(
			async () => {
				const hostState = await getExposedState(hostPage);
				const guestState = await getExposedState(guestPage);

				return {
					host: {
						position: hostState.players[0]?.position,
						activeTilePosition: hostState.activeTilePosition,
						sessionId: hostState.activeTileSessionId,
						stage: hostState.tileState?.['dice_stage']
					},
					guest: {
						position: guestState.players[0]?.position,
						activeTilePosition: guestState.activeTilePosition,
						sessionId: guestState.activeTileSessionId,
						stage: guestState.tileState?.['dice_stage']
					}
				};
			},
			{ timeout: 15_000 }
		)
		.toEqual({
			host: { position: 53, activeTilePosition: 54, sessionId: 9, stage: 'resolved' },
			guest: { position: 53, activeTilePosition: 54, sessionId: 9, stage: 'resolved' }
		});

	await expect(hostPage.getByRole('button', { name: 'Sulje', exact: true })).toBeVisible();
	await expect(guestPage.getByRole('button', { name: 'Sulje', exact: true })).toBeVisible();
	await expect(hostPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(0);
	await expect(guestPage.getByRole('button', { name: 'Pyöritetään..', exact: true })).toHaveCount(
		0
	);

	await hostPage.getByRole('button', { name: 'Sulje', exact: true }).click();

	await expect
		.poll(
			async () => {
				const hostState = await getExposedState(hostPage);
				const guestState = await getExposedState(guestPage);

				return {
					host: {
						currentTurnPlayerId: hostState.currentTurnPlayerId,
						activeTilePosition: hostState.activeTilePosition,
						phase: hostState.phase
					},
					guest: {
						currentTurnPlayerId: guestState.currentTurnPlayerId,
						activeTilePosition: guestState.activeTilePosition,
						phase: guestState.phase
					}
				};
			},
			{ timeout: 8_000 }
		)
		.toEqual({
			host: { currentTurnPlayerId: guestPlayerId, activeTilePosition: null, phase: 'idle' },
			guest: { currentTurnPlayerId: guestPlayerId, activeTilePosition: null, phase: 'idle' }
		});

	await hostContext.close();
	await guestContext.close();
});
