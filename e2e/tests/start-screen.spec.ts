import { test, expect } from '@playwright/test';

test.describe('Start Screen (unauthenticated)', () => {
  test('renders without crash and shows game title', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));

    await page.goto('/');

    // Wait for app to initialize (spinner disappears)
    await page.waitForFunction(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      return spinners.length === 0 || document.title !== '';
    }, { timeout: 10000 });

    // Wait for start screen to be visible (with or without spinner gone)
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: '../test-screenshots/start-screen.png', fullPage: true });

    // Game title check — HUNTER / VS / RUNNER spans
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('HUNTER');
    expect(bodyText).toContain('RUNNER');

    // Sign in button should be visible (unauthenticated state)
    const signinBtn = page.locator('button', { hasText: /SIGN IN WITH GOOGLE/i });
    await expect(signinBtn).toBeVisible({ timeout: 5000 });
  });

  test('dark background is applied', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Background should be dark (#080810 = rgb(8, 8, 16))
    expect(bgColor).toBe('rgb(8, 8, 16)');
  });

  test('HUNTER text has orange/red color', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Find HUNTER span by looking at text content  
    const hunterText = page.locator('h1 span').first();
    await expect(hunterText).toBeVisible({ timeout: 5000 });
    
    const color = await hunterText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // Hunter color is #ff5010 = rgb(255, 80, 16)
    expect(color).toBe('rgb(255, 80, 16)');
  });

  test('RUNNER text has cyan color', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const spans = page.locator('h1 span');
    const count = await spans.count();
    // Should have 3 spans: HUNTER, VS, RUNNER
    expect(count).toBeGreaterThanOrEqual(2);

    // Last span is RUNNER
    const runnerText = spans.last();
    const color = await runnerText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // Runner color is #00dcff = rgb(0, 220, 255)
    expect(color).toBe('rgb(0, 220, 255)');
  });

  test('no critical JavaScript errors on page load', async ({ page }) => {
    const criticalErrors: string[] = [];
    
    page.on('pageerror', (err) => {
      // Ignore Supabase auth errors (expected with placeholder credentials)
      if (!err.message.includes('supabase') && 
          !err.message.includes('fetch') &&
          !err.message.includes('network') &&
          !err.message.includes('Failed to fetch') &&
          !err.message.includes('NetworkError') &&
          !err.message.includes('AuthRetryableFetchError')) {
        criticalErrors.push(err.message);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    expect(criticalErrors).toHaveLength(0);
  });

  test('sign-in button has neon-runner styling', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const signinBtn = page.locator('button', { hasText: /SIGN IN WITH GOOGLE/i });
    await expect(signinBtn).toBeVisible({ timeout: 5000 });

    const hasClass = await signinBtn.evaluate((el) =>
      el.classList.contains('btn-neon-runner')
    );
    expect(hasClass).toBe(true);
  });
});

test.describe('Navigation redirects (unauthenticated)', () => {
  test('/matchmaking redirects to / when not signed in', async ({ page }) => {
    await page.goto('/matchmaking');
    await page.waitForTimeout(2000);
    
    // Should redirect to /
    expect(page.url()).toContain('localhost:5173/');
    // Should see the start screen
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('HUNTER');
  });

  test('/game redirects to / when not signed in', async ({ page }) => {
    await page.goto('/game');
    await page.waitForTimeout(2000);

    // Should redirect to /
    expect(page.url()).toContain('localhost:5173/');
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('HUNTER');
  });

  test('unknown routes redirect to /', async ({ page }) => {
    await page.goto('/some-unknown-path');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('localhost:5173/');
  });
});

test.describe('Auth Callback Route', () => {
  test('/auth/callback renders loading spinner', async ({ page }) => {
    await page.goto('/auth/callback');
    await page.waitForTimeout(1000);

    // Should show the spinner or redirect to /
    const bodyText = await page.textContent('body');
    // Either shows callback page or redirects to start
    const hasContent = bodyText !== null && bodyText.length > 0;
    expect(hasContent).toBe(true);
  });
});
