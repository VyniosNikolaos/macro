import type { JSX } from 'solid-js';

type LayerDepth = 0 | 1 | 2 | 3 | 4 | 5;

type LayerProps = {
  children?: JSX.Element;
  depth?: LayerDepth;
};

const clampDepth = (depth: number): LayerDepth =>
  Math.max(0, Math.min(5, depth)) as LayerDepth;

/**
 * Establishes only the three layer-relative semantic surface colors. Structural
 * colors such as panel, dialog, and menu remain stable across nested layers.
 */
export function Layer(props: LayerProps) {
  const depth = () => clampDepth(props.depth ?? 0);
  const surface = () => `var(--color-surface-${depth()})`;
  const inset = () => `var(--color-surface-${clampDepth(depth() - 1)})`;
  const lift = () => `var(--color-surface-${clampDepth(depth() + 1)})`;

  return (
    <div
      data-layer-depth={depth()}
      style={{
        display: 'contents',
        '--color-surface': surface(),
        '--color-inset': inset(),
        '--color-lift': lift(),
      }}
    >
      {props.children}
    </div>
  );
}
