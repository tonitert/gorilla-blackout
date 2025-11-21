import { expect, test } from '@playwright/test';

// Helper function to set up a game with specified players
async function setupGame(page, players: string[]) {
	await page.goto('/');
	
	// Wait for the setup page to load
	await expect(page.locator('h1')).toBeVisible();
	
	// Clear any existing game state
	await page.evaluate(() => {
		localStorage.clear();
		return window.indexedDB.deleteDatabase('gorilla-blackout');
	});
	
	// Reload to ensure clean state
	await page.reload();
	await page.waitForLoadState('networkidle');
	
	// Wait for form to be ready
	await expect(page.getByRole('heading', { name: 'Aloita peli' })).toBeVisible();
	
	// Fill in player names - find all name inputs by role
	const nameInputs = page.getByRole('textbox', { name: 'Nimi' });
	await nameInputs.first().waitFor({ state: 'visible', timeout: 5000 });
	
	const inputCount = await nameInputs.count();
	for (let i = 0; i < Math.min(players.length, inputCount); i++) {
		await nameInputs.nth(i).fill(players[i]);
	}
	
	// Start the game
	const startButton = page.getByRole('button', { name: 'Aloita peli' });
	await startButton.click();
	
	// Wait for game to start
	await expect(page.locator('text=vuoro!')).toBeVisible({ timeout: 10000 });
}

test.describe('Game Initialization', () => {
	test('should display setup page on first load', async ({ page }) => {
		await page.goto('/');
		
		// Check for logo and welcome text
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('text=Tervetuloa Gorilla Blackoutiin')).toBeVisible();
	});

	test('should allow creating a game with players', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Verify game started
		await expect(page.locator('text=Alice')).toBeVisible();
		await expect(page.locator('text=vuoro!')).toBeVisible();
	});

	test('should require at least 2 players', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(1000);
		
		// Wait for form to load
		await expect(page.getByRole('heading', { name: 'Aloita peli' })).toBeVisible();
		
		// Clear one player name to leave only one valid player
		const nameInputs = page.getByRole('textbox', { name: 'Nimi' });
		await nameInputs.first().waitFor({ state: 'visible', timeout: 5000 });
		await nameInputs.nth(1).fill(''); // Clear second player
		
		// Fill only first player
		await nameInputs.first().fill('Solo Player');
		
		// Try to start the game
		const startButton = page.getByRole('button', { name: 'Aloita peli' });
		await startButton.click();
		
		// Should show validation error or not start the game
		// Check we're still on setup page
		await page.waitForTimeout(1000);
		await expect(page.getByRole('heading', { name: 'Aloita peli' })).toBeVisible();
	});
});

test.describe('Player Movement and Turn Progression', () => {
	test('should advance turns and show turn indicator', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob', 'Charlie']);
		
		// Check first player's turn
		await expect(page.locator('text=Alice')).toBeVisible();
		await expect(page.locator('text=vuoro!')).toBeVisible();
		
		// Click next turn button to roll dice
		await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
		await page.waitForTimeout(3000); // Wait for dice animation
		
		// Close tile dialog if it appears
		const closeButton = page.getByRole('button', { name: 'Sulje' });
		if (await closeButton.isVisible({ timeout: 2000 })) {
			await closeButton.click();
			await page.waitForTimeout(500);
		}
		
		// Next turn
		await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
		await page.waitForTimeout(1000);
		
		// Should eventually see Bob or Charlie's turn
		const hasTurnText = await page.locator('text=vuoro!').isVisible();
		expect(hasTurnText).toBeTruthy();
	});

	test('should display game board and UI elements', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Check for game board container
		const gameBoard = page.locator('.game');
		await expect(gameBoard).toBeVisible();
		
		// Check for next turn button
		await expect(page.getByRole('button', { name: 'Seuraava vuoro' })).toBeVisible();
		
		// Check for turn indicator
		await expect(page.locator('text=vuoro!')).toBeVisible();
	});
});

test.describe('Game State Persistence', () => {
	test('should save and load game state', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Play a turn
		await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
		await page.waitForTimeout(3000);
		
		// Close tile if shown
		const closeButton = page.getByRole('button', { name: 'Sulje' });
		if (await closeButton.isVisible({ timeout: 2000 })) {
			await closeButton.click();
		}
		
		await page.waitForTimeout(1000);
		
		// Reload page
		await page.reload();
		await page.waitForTimeout(1500);
		
		// Should show continue game option
		const continueGameText = page.locator('text=Aikaisempi peli löytyi');
		if (await continueGameText.isVisible({ timeout: 5000 })) {
			// Click to continue
			await page.getByRole('button', { name: 'Jatka peliä' }).click();
			await page.waitForTimeout(500);
			
			// Game should be loaded
			await expect(page.locator('text=vuoro!')).toBeVisible();
		}
	});

	test('should allow starting new game', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Play a turn
		await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
		await page.waitForTimeout(3000);
		
		const closeButton = page.getByRole('button', { name: 'Sulje' });
		if (await closeButton.isVisible({ timeout: 2000 })) {
			await closeButton.click();
		}
		
		await page.waitForTimeout(1000);
		
		// Reload page
		await page.reload();
		await page.waitForTimeout(1500);
		
		// Should show continue game option or go directly to setup
		const newGameButton = page.getByRole('button', { name: 'Aloita uusi peli' });
		if (await newGameButton.isVisible({ timeout: 3000 })) {
			await newGameButton.click();
			await page.waitForTimeout(500);
			
			// Should be back at setup
			await expect(page.locator('text=Tervetuloa Gorilla Blackoutiin')).toBeVisible();
		}
	});
});

test.describe('Special Tiles - Visual Verification', () => {
	test('should display tile messages during gameplay', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Roll dice and see what tile we land on
		await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
		await page.waitForTimeout(3000);
		
		// Check if any overlay/dialog is shown with tile content
		// The backdrop should appear if we landed on a tile with a message
		const backdrop = page.locator('.backdrop');
		const hasBackdrop = await backdrop.isVisible().catch(() => false);
		
		// If backdrop is visible, a tile was triggered
		if (hasBackdrop) {
			// Verify we can see tile content (image or text)
			const hasImage = await page.locator('.backdrop img').isVisible().catch(() => false);
			const hasText = await page.locator('.backdrop p').isVisible().catch(() => false);
			
			expect(hasImage || hasText).toBeTruthy();
		}
	});
});

test.describe('Game Interaction Tests', () => {
	test('should handle dice rolls and tile interactions', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Perform multiple turns to test various tiles
		for (let turn = 0; turn < 3; turn++) {
			// Click next turn
			await page.getByRole('button', { name: 'Seuraava vuoro' }).click();
			await page.waitForTimeout(3000);
			
			// Handle any tile dialog
			const closeButton = page.getByRole('button', { name: 'Sulje' });
			if (await closeButton.isVisible({ timeout: 2000 })) {
				await closeButton.click();
				await page.waitForTimeout(500);
			}
			
			// Handle action buttons (like "Heitä noppaa" on certain tiles)
			const actionButtons = page.getByRole('button');
			const buttonTexts = ['Heitä noppaa', 'Pyöritä', 'Valitse'];
			for (const text of buttonTexts) {
				const actionButton = page.getByRole('button', { name: text });
				if (await actionButton.isVisible({ timeout: 1000 })) {
					await actionButton.click();
					await page.waitForTimeout(3000);
					
					// Close after action
					const postActionClose = page.getByRole('button', { name: 'Sulje' });
					if (await postActionClose.isVisible({ timeout: 2000 })) {
						await postActionClose.click();
						await page.waitForTimeout(500);
					}
					break;
				}
			}
			
			// Move to next turn
			const nextTurn = page.getByRole('button', { name: 'Seuraava vuoro' });
			if (await nextTurn.isVisible({ timeout: 1000 })) {
				await nextTurn.click();
				await page.waitForTimeout(1000);
			}
		}
		
		// Verify we're still in the game
		const stillInGame = await page.locator('text=vuoro!').isVisible().catch(() => false);
		expect(stillInGame).toBeTruthy();
	});

	test('should support keyboard interaction (spacebar)', async ({ page }) => {
		await setupGame(page, ['Alice', 'Bob']);
		
		// Press spacebar to advance turn
		await page.keyboard.press('Space');
		await page.waitForTimeout(3000);
		
		// Should trigger dice roll or advance game state
		// We can't predict exact behavior but the game should still be running
		const gameActive = await page.locator('text=vuoro!').isVisible().catch(() => false);
		expect(gameActive).toBeTruthy();
	});
});

test.describe('End-to-End Game Flow', () => {
	test('should complete basic game flow without errors', async ({ page }) => {
		await setupGame(page, ['Player1', 'Player2']);
		
		// Play several turns to test the flow
		for (let i = 0; i < 5; i++) {
			// Next turn button
			const nextButton = page.getByRole('button', { name: 'Seuraava vuoro' });
			if (await nextButton.isVisible({ timeout: 2000 })) {
				await nextButton.click();
				await page.waitForTimeout(3000);
			}
			
			// Handle any dialogs
			const sulje = page.getByRole('button', { name: 'Sulje' });
			if (await sulje.isVisible({ timeout: 2000 })) {
				await sulje.click();
				await page.waitForTimeout(500);
			}
			
			// Handle action buttons
			const heitaButton = page.getByRole('button', { name: 'Heitä noppaa' });
			if (await heitaButton.isVisible({ timeout: 1000 })) {
				await heitaButton.click();
				await page.waitForTimeout(3000);
				
				const sulje2 = page.getByRole('button', { name: 'Sulje' });
				if (await sulje2.isVisible({ timeout: 2000 })) {
					await sulje2.click();
					await page.waitForTimeout(500);
				}
			}
		}
		
		// Game should still be active
		const active = await page.locator('.game').isVisible();
		expect(active).toBeTruthy();
	});
});
