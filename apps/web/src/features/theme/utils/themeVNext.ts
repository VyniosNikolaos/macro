import type {
  InputColorToken,
  SemanticToken,
  ThemeColorMode,
  ThemeColorTokens,
  ThemeV2,
  ThemeV2Tokens,
} from '../types/themeTypes';

export const FIXED_PALETTE_HUES = {
  red: 25,
  orange: 50,
  amber: 70,
  yellow: 95,
  lime: 125,
  green: 145,
  teal: 175,
  cyan: 205,
  blue: 255,
  violet: 285,
  purple: 310,
  pink: 345,
} as const satisfies Record<string, number>;

const roundToEightDecimals = (value: number) => {
  const rounded = Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const oklch = (color: { l: number; c: number; h: number }) =>
  `oklch(${roundToEightDecimals(color.l)} ${roundToEightDecimals(color.c)} ${roundToEightDecimals(color.h)}deg)`;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function buildSurfaceRamp(
  tokens: ThemeV2Tokens,
  mode: ThemeColorMode
): string[] {
  const legacy = [tokens.b0, tokens.b1, tokens.b2, tokens.b3, tokens.b4];

  if (mode === 'light') {
    // Legacy light themes expected Layer to raise b0 mathematically, so their
    // authored b1-b4 values often run in the opposite direction. VNext stores
    // the actual layer colors: preserve the base and interpolate toward white.
    return Array.from({ length: 6 }, (_, index) => {
      const progress = index / 5;
      return oklch({
        l: clamp(tokens.b0.l + (1 - tokens.b0.l) * progress),
        c: tokens.b0.c * (1 - progress),
        h: tokens.b0.h,
      });
    });
  }

  // Dark legacy ramps already rise with depth. Guard against any small
  // non-monotonic authored steps, then extend the last visible interval.
  let previousLightness = legacy[0]?.l ?? 0;
  const ramp = legacy.map((color) => {
    previousLightness = Math.max(previousLightness, color.l);
    return oklch({ ...color, l: previousLightness });
  });
  const last = legacy[4] ?? tokens.b0;
  const previous = legacy[3] ?? tokens.b0;
  ramp.push(
    oklch({
      ...last,
      l: clamp(previousLightness + Math.max(0.02, last.l - previous.l)),
    })
  );
  return ramp;
}

export const tokenReference = (token: string) => `var(--color-${token})`;

export const alphaToken = (token: string, alpha: number) =>
  `color-mix(in oklch, ${tokenReference(token)} ${Math.round(alpha * 10000) / 100}%, transparent)`;

export const mixTokens = (first: string, second: string, amount: number) =>
  `color-mix(in oklch, ${tokenReference(first)} ${Math.round(amount * 10000) / 100}%, ${tokenReference(second)})`;

/**
 * Converts a legacy b/c/a theme into the VNext flat token model. Palette hues
 * are fixed while lightness and chroma follow the theme accent.
 */
export function legacyThemeToVNextTokens(
  theme: Pick<ThemeV2, 'tokens' | 'overrides'> | { tokens: ThemeV2Tokens },
  mode: ThemeColorMode
): ThemeColorTokens {
  const { tokens } = theme;
  const surfaces = buildSurfaceRamp(tokens, mode);
  const result: ThemeColorTokens = {
    'surface-0': surfaces[0] ?? oklch(tokens.b0),
    'surface-1': surfaces[1] ?? oklch(tokens.b1),
    'surface-2': surfaces[2] ?? oklch(tokens.b2),
    'surface-3': surfaces[3] ?? oklch(tokens.b3),
    'surface-4': surfaces[4] ?? oklch(tokens.b4),
    'surface-5': surfaces[5] ?? oklch(tokens.b4),
    'content-0': oklch(tokens.c0),
    'content-1': oklch(tokens.c1),
    'content-2': oklch(tokens.c2),
    'content-3': oklch(tokens.c3),
    'content-4': oklch(tokens.c4),
    edge: oklch(tokens.b4),
    'edge-muted': oklch(tokens.b3),
    'edge-subtle': oklch(tokens.b2),
    accent: oklch(tokens.a0),
  };

  for (const [name, hue] of Object.entries(FIXED_PALETTE_HUES)) {
    result[name] = oklch({ l: tokens.a0.l, c: tokens.a0.c, h: hue });
  }

  const defaults: Record<SemanticToken, string> = {
    surface: 'var(--layer-surface)',
    inset: 'var(--layer-inset)',
    lift: 'var(--layer-lift)',
    ink: tokenReference('content-0'),
    'ink-muted': tokenReference('content-1'),
    'ink-subtle': tokenReference('content-2'),
    'ink-disabled': tokenReference('content-3'),
    'ink-placeholder': tokenReference('content-4'),
    page: tokenReference('surface-0'),
    panel: tokenReference('surface-1'),
    dialog: tokenReference('surface-2'),
    menu: tokenReference('surface-2'),
    input: 'transparent',
    'input-focus': tokenReference('lift'),
    message: tokenReference('lift'),
    hover: alphaToken('content-0', 0.03),
    active: alphaToken('content-0', 0.06),
    selected: alphaToken('accent', 0.08),
    success: tokenReference('green'),
    warning: tokenReference(mode === 'dark' ? 'amber' : 'yellow'),
    failure: tokenReference('red'),
    chrome: tokenReference('surface-5'),
  };

  Object.assign(result, defaults);

  // Preserve the old custom semantic overrides during conversion.
  const overrides = 'overrides' in theme ? theme.overrides : undefined;
  for (const override of overrides ?? []) {
    if (override.token in defaults) result[override.token] = oklch(override.value);
  }

  return result;
}

export function getThemeColorMode(tokens: ThemeV2Tokens): ThemeColorMode {
  return tokens.c0.l > tokens.b0.l ? 'dark' : 'light';
}

export function getThemeColorTokens(theme: ThemeV2): ThemeColorTokens {
  return {
    ...legacyThemeToVNextTokens(theme, getThemeColorMode(theme.tokens)),
    ...theme.colorTokens,
  };
}

export function isInputColorToken(token: string): token is InputColorToken {
  return (
    token.startsWith('surface-') ||
    token.startsWith('content-') ||
    token === 'edge' ||
    token === 'edge-muted' ||
    token === 'edge-subtle' ||
    token === 'accent' ||
    token in FIXED_PALETTE_HUES
  );
}
