import { CatchDetector } from './catch';
import type { PlayerState } from '../state/PlayerState';

function playerAt(x: number, z: number): PlayerState {
  const p = { x, z } as PlayerState;
  return p;
}

describe('CatchDetector', () => {
  const catchDistance = 2;

  it('does not catch when players are far apart', () => {
    const d = new CatchDetector();
    const hunter = playerAt(0, 0);
    const runner = playerAt(10, 0);
    expect(d.check(hunter, runner, catchDistance, 0)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 500)).toBe(false);
  });

  it('does not catch immediately when entering range', () => {
    const d = new CatchDetector();
    const hunter = playerAt(0, 0);
    const runner = playerAt(0.5, 0);
    expect(d.check(hunter, runner, catchDistance, 0)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 50)).toBe(false);
  });

  it('catches after proximity debounce (100ms)', () => {
    const d = new CatchDetector();
    const hunter = playerAt(0, 0);
    const runner = playerAt(0.5, 0);
    expect(d.check(hunter, runner, catchDistance, 0)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 99)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 100)).toBe(true);
  });

  it('resets proximity timer when leaving range', () => {
    const d = new CatchDetector();
    const hunter = playerAt(0, 0);
    let runner = playerAt(0.5, 0);
    d.check(hunter, runner, catchDistance, 0);
    d.check(hunter, runner, catchDistance, 50);
    runner = playerAt(10, 0);
    d.check(hunter, runner, catchDistance, 60);
    runner = playerAt(0.5, 0);
    expect(d.check(hunter, runner, catchDistance, 61)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 161)).toBe(true);
  });

  it('reset clears state', () => {
    const d = new CatchDetector();
    const hunter = playerAt(0, 0);
    const runner = playerAt(0.5, 0);
    d.check(hunter, runner, catchDistance, 0);
    d.reset();
    expect(d.check(hunter, runner, catchDistance, 200)).toBe(false);
    expect(d.check(hunter, runner, catchDistance, 300)).toBe(true);
  });
});
