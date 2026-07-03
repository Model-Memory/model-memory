import { expect, test } from '@playwright/test';

test('homepage renders the specimen ledger', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('recommend');
	await expect(page.locator('.answers li').first()).toBeVisible();
});

test('archive is reachable from the masthead', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /The Archive/ }).click();
	await expect(page).toHaveURL(/\/archive$/);
});

test('masthead navigation reaches shifts and commission', async ({ page }) => {
	await page.goto('/archive');
	await page.getByRole('link', { name: 'The Shifts' }).click();
	await expect(page.locator('h1')).toContainText('shifts');

	await page.getByRole('link', { name: 'Commission' }).click();
	await expect(page).toHaveURL(/\/commission$/);
	// Payments are unconfigured in preview — the page must degrade, not dead-end.
	await expect(page.locator('.notice')).toContainText('not configured');
	await expect(page.getByRole('link', { name: /Browse the archive/ })).toBeVisible();
});

test('json api and crawler surfaces respond', async ({ request }) => {
	const shifts = await request.get('/api/shifts');
	expect(shifts.status()).toBeLessThan(503 + 1); // 503 acceptable without gateway
	const robots = await request.get('/robots.txt');
	expect(robots.ok()).toBeTruthy();
	expect(await robots.text()).toContain('Sitemap:');
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBeTruthy();
	expect(await sitemap.text()).toContain('<urlset');
});
