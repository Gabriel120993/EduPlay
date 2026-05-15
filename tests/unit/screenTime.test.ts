import { describe, expect, it } from 'vitest';
import { utcDayStart } from '../../src/lib/screenTime';

describe('screenTime.utcDayStart', () => {
  it('normaliza a medianoche UTC del mismo día civil', () => {
    const d = new Date(Date.UTC(2026, 4, 12, 14, 30, 45, 123));
    const s = utcDayStart(d);
    expect(s.getUTCFullYear()).toBe(2026);
    expect(s.getUTCMonth()).toBe(4);
    expect(s.getUTCDate()).toBe(12);
    expect(s.getUTCHours()).toBe(0);
    expect(s.getUTCMinutes()).toBe(0);
    expect(s.getUTCSeconds()).toBe(0);
    expect(s.getUTCMilliseconds()).toBe(0);
  });

  it('cambia de día UTC al cruzar medianoche local implícita en UTC', () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 30, 0));
    const s = utcDayStart(d);
    expect(s.toISOString().startsWith('2026-01-01T00:00:00.000Z')).toBe(true);
  });
});
