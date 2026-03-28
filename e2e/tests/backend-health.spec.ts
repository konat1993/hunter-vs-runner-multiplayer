import { test, expect } from '@playwright/test';

/**
 * Node often resolves `localhost` to IPv6 (::1) first; the game server may only accept IPv4.
 * Using 127.0.0.1 avoids ECONNREFUSED on ::1 when the backend is up.
 */
function healthUrl(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  try {
    const u = new URL(trimmed);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
    }
    return `${u.origin}/health`;
  } catch {
    return `${trimmed}/health`;
  }
}

/**
 * Optional smoke for the game server HTTP API.
 * Backend must be running (e.g. cd ../backend && npm run start:dev).
 */
test.describe('Backend HTTP (optional)', () => {
  test('GET /health returns ok', async ({ request }) => {
    const base = process.env.E2E_BACKEND_URL;
    test.skip(
      !base,
      'Set E2E_BACKEND_URL (e.g. http://127.0.0.1:2567) to run this test',
    );

    const res = await request.get(healthUrl(base!));
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe('ok');
  });
});
