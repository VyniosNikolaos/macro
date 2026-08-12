import { describe, expect, it } from 'vitest';
import type { ThemeV2Tokens } from '../../types/themeTypes';
import {
  parseThemeAssignment,
  serializeThemeAssignment,
} from '../themeAssignments';
import { legacyThemeToVNextTokens } from '../themeVNext';

const legacyTokens: ThemeV2Tokens = {
  a0: { l: 0.7, c: 0.2, h: 40 },
  a1: { l: 0.7, c: 0.2, h: 80 },
  a2: { l: 0.7, c: 0.2, h: 120 },
  a3: { l: 0.7, c: 0.2, h: 160 },
  a4: { l: 0.7, c: 0.2, h: 200 },
  b0: { l: 0.1, c: 0, h: 0 },
  b1: { l: 0.2, c: 0, h: 0 },
  b2: { l: 0.3, c: 0, h: 0 },
  b3: { l: 0.4, c: 0, h: 0 },
  b4: { l: 0.5, c: 0, h: 0 },
  c0: { l: 0.95, c: 0, h: 0 },
  c1: { l: 0.85, c: 0, h: 0 },
  c2: { l: 0.75, c: 0, h: 0 },
  c3: { l: 0.65, c: 0, h: 0 },
  c4: { l: 0.55, c: 0, h: 0 },
};

describe('legacyThemeToVNextTokens', () => {
  it('builds the final input and semantic registry', () => {
    const result = legacyThemeToVNextTokens(
      { tokens: legacyTokens },
      'dark'
    );

    expect(result['surface-0']).toBe('oklch(0.1 0 0deg)');
    expect(result['surface-5']).toContain('surface-4');
    expect(result['content-4']).toBe('oklch(0.55 0 0deg)');
    expect(result['content-5']).toBeUndefined();
    expect(result.chrome).toBe('var(--color-surface-5)');
    expect(result.warning).toBe('var(--color-amber)');
    expect(result.pink).toBe('oklch(0.7 0.2 345deg)');
  });
});

describe('theme assignment serialization', () => {
  it('round trips a linked token with alpha', () => {
    const value = serializeThemeAssignment({
      kind: 'linked',
      token: 'accent',
      alpha: 0.08,
    });

    expect(parseThemeAssignment(value)).toEqual({
      kind: 'linked',
      token: 'accent',
      alpha: 0.08,
    });
  });

  it('round trips a mixed token with alpha', () => {
    const assignment = {
      kind: 'mixed' as const,
      first: 'content-0',
      second: 'surface-0',
      mix: 0.35,
      alpha: 0.6,
    };

    expect(parseThemeAssignment(serializeThemeAssignment(assignment))).toEqual(
      assignment
    );
  });
});
