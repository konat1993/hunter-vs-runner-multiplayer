import { Client } from '@colyseus/sdk';
import { config } from './config';

let _client: Client | null = null;

export function getColyseusClient(): Client {
  if (!_client) {
    _client = new Client(config.colyseusEndpoint);
  }
  return _client;
}

export async function joinGameRoom(accessToken: string) {
  const client = getColyseusClient();
  return client.joinOrCreate('game', { accessToken });
}

export async function joinGameRoomById(roomId: string, accessToken: string) {
  const client = getColyseusClient();
  return client.joinById(roomId, { accessToken });
}

export async function fetchActiveGameRoomId(accessToken: string): Promise<string | null> {
  const response = await fetch(`${config.backendHttpEndpoint}/session/active-game`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status >= 500) {
    throw new Error(`Backend unavailable (${response.status})`);
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    active?: boolean;
    roomId?: string | null;
  };
  return payload.active && payload.roomId ? payload.roomId : null;
}
