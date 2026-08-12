import type {
  InputColorToken,
  SemanticToken,
  ThemeColorTokens,
  ThemeV2,
  ThemeV2Tokens,
} from '../types/themeTypes';

export type ThemeColorMode = 'light' | 'dark';

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

const oklch = (color: { l: number; c: number; h: number }) =>
  `oklch(${color.l} ${color.c} ${color.h}deg)`;

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
  const result: ThemeColorTokens = {
    'surface-0': oklch(tokens.b0),
    'surface-1': oklch(tokens.b1),
    'surface-2': oklch(tokens.b2),
    'surface-3': oklch(tokens.b3),
    'surface-4': oklch(tokens.b4),
    'surface-5': mixTokens('surface-4', 'content-0', 0.85),
    'content-0': oklch(tokens.c0),
    'content-1': oklch(tokens.c1),
    'content-2': oklch(tokens.c2),
    'content-3': oklch(tokens.c3),
    'content-4': oklch(tokens.c4),
    edge: tokenReference('surface-4'),
    'edge-muted': tokenReference('surface-3'),
    'edge-subtle': tokenReference('surface-2'),
    accent: oklch(tokens.a0),
  };

  for (const [name, hue] of Object.entries(FIXED_PALETTE_HUES)) {
    result[name] = `oklch(${tokens.a0.l} ${tokens.a0.c} ${hue}deg)`;
  }

  const defaults: Record<SemanticToken, string> = {
    surface: tokenReference('surface-0'),
    inset: tokenReference('surface-0'),
    lift: tokenReference('surface-1'),
    ink: tokenReference('content-0'),
    'ink-muted': tokenReference('content-1'),
    'ink-subtle': tokenReference('content-2'),
    'ink-disabled': tokenReference('content-3'),
    'ink-placeholder': tokenReference('content-4'),
    page: tokenReference('surface-0'),
    panel: tokenReference('surface-2'),
    dialog: tokenReference('surface-2'),
    menu: tokenReference('surface-2'),
    input: 'transparent',
    'input-focus': tokenReference('lift'),
    message: tokenReference('lift'),
    hover: alphaToken('content-0', 0.05),
    active: alphaToken('content-0', 0.1),
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
  return (
    theme.colorTokens ??
    legacyThemeToVNextTokens(theme, getThemeColorMode(theme.tokens))
  );
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
