import { test, expect, type Page } from '@playwright/test';

/** Wait until auth init finished and unauthenticated start screen is interactive. */
async function waitForStartScreen(page: Page) {
  await expect(page.getByTestId('game-title')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('email-login-submit')).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Start Screen (unauthenticated)', () => {
  test('renders without crash and shows game title', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));

    await page.goto('/');
    await waitForStartScreen(page);

    await expect(page.getByTestId('game-title-hunter')).toHaveText('HUNTER');
    await expect(page.getByTestId('game-title-runner')).toHaveText('RUNNER');

    const loginBtn = page.getByTestId('email-login-submit');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toContainText(/EMAIL LOGIN LINK/i);
  });

  test('dark background is applied', async ({ page }) => {
    await page.goto('/');
    await waitForStartScreen(page);

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bgColor).toBe('rgb(8, 8, 16)');
  });

  test('HUNTER text has orange/red color', async ({ page }) => {
    await page.goto('/');
    await waitForStartScreen(page);

    const hunterText = page.getByTestId('game-title-hunter');
    const color = await hunterText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    expect(color).toBe('rgb(255, 80, 16)');
  });

  test('RUNNER text has cyan color', async ({ page }) => {
    await page.goto('/');
    await waitForStartScreen(page);

    const runnerText = page.getByTestId('game-title-runner');
    const color = await runnerText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    expect(color).toBe('rgb(0, 220, 255)');
  });

  test('no critical JavaScript errors on page load', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('pageerror', (err) => {
      if (
        !err.message.includes('supabase') &&
        !err.message.includes('fetch') &&
        !err.message.includes('network') &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('AuthRetryableFetchError')
      ) {
        criticalErrors.push(err.message);
      }
    });

    await page.goto('/');
    await waitForStartScreen(page);

    expect(criticalErrors).toHaveLength(0);
  });

  test('email login button has neon-runner styling', async ({ page }) => {
    await page.goto('/');
    await waitForStartScreen(page);

    const loginBtn = page.getByTestId('email-login-submit');
    const hasClass = await loginBtn.evaluate((el) =>
      el.classList.contains('btn-neon-runner'),
    );
    expect(hasClass).toBe(true);
  });
});

test.describe('Navigation redirects (unauthenticated)', () => {
  test('/matchmaking redirects to / when not signed in', async ({ page }) => {
    await page.goto('/matchmaking');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('game-title')).toBeVisible({ timeout: 15000 });
  });

  test('/game redirects to / when not signed in', async ({ page }) => {
    await page.goto('/game');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('game-title')).toBeVisible({ timeout: 15000 });
  });

  test('unknown routes redirect to /', async ({ page }) => {
    await page.goto('/some-unknown-path');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Auth Callback Route', () => {
  test('/auth/callback shows signing state or returns to start', async ({
    page,
  }) => {
    await page.goto('/auth/callback');
    const signing = page.getByText(/Signing you in/i);
    const homeTitle = page.getByTestId('game-title');
    await expect(signing.or(homeTitle)).toBeVisible({ timeout: 15000 });
  });
});
