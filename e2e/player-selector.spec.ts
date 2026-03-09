import { expect, test } from '@playwright/test';

async function startGameWithPlayers(page: import('@playwright/test').Page, names: string[]) {
	await page.goto('/');

	for (let i = 0; i < names.length; i++) {
		if (i >= 2) {
			await page.getByRole('button', { name: 'Lisää pelaaja' }).click();
		}
		await page.locator('input').nth(i).fill(names[i]);
	}

	await page.getByRole('button', { name: 'Aloita peli' }).click();
	await expect(page.getByRole('button', { name: 'Muokkaa pelaajia' }).last()).toBeVisible();
}

test('removing a middle player keeps the correct players in order', async ({ page }) => {
	await startGameWithPlayers(page, ['Alice', 'Bob', 'Carol']);

	await page.getByRole('button', { name: 'Muokkaa pelaajia' }).last().click();
	await expect(page.getByRole('button', { name: 'Tallenna' })).toBeVisible();

	await page.getByRole('button', { name: 'Poista' }).nth(1).click();

	await expect(page.locator('input').nth(0)).toHaveValue('Alice');
	await expect(page.locator('input').nth(1)).toHaveValue('Carol');

	await page.getByRole('button', { name: 'Tallenna' }).click();
	await expect(page.getByText('Pelaajan Alice vuoro!')).toBeVisible();
});

test('editing players does not set current player to Unknown', async ({ page }) => {
	await startGameWithPlayers(page, ['Alpha', 'Beta', 'Gamma']);

	await page.getByRole('button', { name: 'Muokkaa pelaajia' }).last().click();
	await page.getByRole('button', { name: 'Poista' }).first().click();
	await page.getByRole('button', { name: 'Tallenna' }).click();

	await expect(page.getByText('Pelaajan Unknown vuoro!')).not.toBeVisible();
	await expect(page.getByText(/Pelaajan .* vuoro!/)).toBeVisible();
});
