import { useGameStore } from '../state/game.store';
import { useMatchmakingStore } from '../state/matchmaking.store';

/** Leaves any open Colyseus room held by game or matchmaking state (deduped if same ref). */
export function disconnectActiveColyseusRoom() {
  const gameRoom = useGameStore.getState().room;
  const mmRoom = useMatchmakingStore.getState().room;
  if (gameRoom && mmRoom && gameRoom !== mmRoom) {
    try {
      gameRoom.leave();
    } catch {
      /* ignore */
    }
    try {
      mmRoom.leave();
    } catch {
      /* ignore */
    }
  } else {
    const room = gameRoom ?? mmRoom;
    if (room) {
      try {
        room.leave();
      } catch {
        /* ignore */
      }
    }
  }
}
