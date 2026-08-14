import type {
  InputColorToken,
  SemanticToken,
  ThemeColorMode,
  ThemeColorTokens,
  ThemeV2,
  ThemeV2Tokens,
} from '../types/themeTypes';

/** Tailwind 500 colors shared by every theme. */
export const FIXED_PALETTE_COLORS = {
  red: 'oklch(63.7% 0.237 25.331)',
  orange: 'oklch(70.5% 0.213 47.604)',
  amber: 'oklch(76.9% 0.188 70.08)',
  yellow: 'oklch(79.5% 0.184 86.047)',
  lime: 'oklch(76.8% 0.233 130.85)',
  green: 'oklch(72.3% 0.219 149.579)',
  teal: 'oklch(70.4% 0.14 182.503)',
  cyan: 'oklch(71.5% 0.143 215.221)',
  blue: 'oklch(62.3% 0.214 259.815)',
  violet: 'oklch(60.6% 0.25 292.717)',
  purple: 'oklch(62.7% 0.265 303.9)',
  pink: 'oklch(65.6% 0.241 354.308)',
} as const satisfies Record<string, string>;

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
    return Array.from({ length: 5 }, (_, index) => {
      const progress = index / 4;
      return oklch({
        l: clamp(tokens.b0.l + (1 - tokens.b0.l) * progress),
        c: tokens.b0.c * (1 - progress),
        h: tokens.b0.h,
      });
    });
  }

  // Dark legacy ramps already rise with depth. Guard against any small
  // non-monotonic authored steps.
  let previousLightness = legacy[0]?.l ?? 0;
  return legacy.map((color) => {
    previousLightness = Math.max(previousLightness, color.l);
    return oklch({ ...color, l: previousLightness });
  });
}

export const tokenReference = (token: string) => `var(--color-${token})`;

export const alphaToken = (token: string, alpha: number) =>
  `color-mix(in oklch, ${tokenReference(token)} ${Math.round(alpha * 10000) / 100}%, transparent)`;

export const mixTokens = (
  first: string,
  second: string,
  amount: number,
  space: 'oklch' | 'srgb' = 'oklch'
) =>
  `color-mix(in ${space}, ${tokenReference(first)} ${Math.round(amount * 10000) / 100}%, ${tokenReference(second)})`;

/** Drops authored tokens removed from the V3 registry while preserving future
 * extension keys. */
export function removeDeprecatedThemeColorTokens(
  tokens: ThemeColorTokens
): ThemeColorTokens {
  const next = { ...tokens };
  delete next['surface-5'];
  delete next['edge-subtle'];
  return next;
}

/**
 * Converts a legacy b/c/a theme into the VNext flat token model. Palette
 * colors use the shared Tailwind 500 values.
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
    'content-0': oklch(tokens.c0),
    'content-1': oklch(tokens.c1),
    'content-2': oklch(tokens.c2),
    'content-3': oklch(tokens.c3),
    'content-4': oklch(tokens.c4),
    edge: oklch(tokens.b4),
    'edge-muted': oklch(tokens.b3),
    accent: oklch(tokens.a0),
  };

  for (const [name, color] of Object.entries(FIXED_PALETTE_COLORS)) {
    result[name] = color;
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
    chrome: tokenReference('surface-4'),
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
    token === 'accent' ||
    token in FIXED_PALETTE_COLORS
  );
}
