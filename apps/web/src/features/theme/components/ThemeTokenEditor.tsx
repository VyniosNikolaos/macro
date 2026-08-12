import PlusIcon from '@phosphor/plus.svg';
import XIcon from '@phosphor/x.svg';
import { Button } from '@ui';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
} from 'solid-js';
import {
  contentTokens,
  edgeTokens,
  inputColorTokens,
  paletteTokens,
  semanticTokens,
  surfaceTokens,
} from '../types/themeTypes';
import { themeColorTokens } from '../signals/themeSignals';
import { convertOklchTo, getOklch } from '../utils/colorUtil';
import {
  parseThemeAssignment,
  serializeThemeAssignment,
  type ThemeAssignment,
} from '../utils/themeAssignments';
import { updateLiveThemeColorToken } from '../utils/themeUtils';
import { ColorPickerPopover } from './ColorPickerPopover';

const TOKEN_OPTIONS = inputColorTokens;

const rawGroups = [
  { label: 'Surface ramp', tokens: surfaceTokens },
  { label: 'Content ramp', tokens: contentTokens },
  { label: 'Edges', tokens: edgeTokens },
  { label: 'Accent', tokens: ['accent'] as const },
  { label: 'Palette', tokens: paletteTokens },
] as const;

function resolvedColor(token: string): string {
  if (typeof document === 'undefined') return '#000000';
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.backgroundColor = `var(--color-${token})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color || '#000000';
}

function ColorControl(props: {
  token: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = () => {
    try {
      return getOklch(props.value);
    } catch {
      return getOklch(resolvedColor(props.token));
    }
  };
  const [l, setL] = createSignal(initial().l);
  const [c, setC] = createSignal(initial().c);
  const [h, setH] = createSignal(initial().h);
  let lastWritten = props.value;

  createEffect(() => {
    const value = props.value;
    if (value === lastWritten) return;
    try {
      const next = getOklch(value);
      setL(next.l);
      setC(next.c);
      // Achromatic colors have no meaningful hue. Keep the picker's hue state.
      if (next.c > 0.0001) setH(next.h);
    } catch {
      // Linked and mixed expressions are edited with assignment controls.
    }
  });

  const write = (next: { l?: number; c?: number; h?: number }) => {
    const nextL = next.l ?? l();
    const nextC = next.c ?? c();
    const nextH = next.h ?? h();
    setL(nextL);
    setC(nextC);
    setH(nextH);
    lastWritten = convertOklchTo(nextL, nextC, nextH, 'oklch');
    props.onChange(lastWritten);
  };

  return (
    <ColorPickerPopover
      l={l}
      c={c}
      h={h}
      onL={(value) => write({ l: value })}
      onC={(value) => write({ c: value })}
      onH={(value) => write({ h: value })}
      ariaLabel={`Edit ${props.token}`}
      trigger={
        <div
          class="size-6 rounded-md border border-edge-muted"
          style={{ 'background-color': `var(--color-${props.token})` }}
        />
      }
    />
  );
}

function TokenPill(props: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div class="flex h-7 min-w-0 items-center rounded-full bg-ink/5 pl-2 text-xs text-ink">
      <span
        class="mr-1 size-3 shrink-0 rounded-full border border-edge-muted"
        style={{ 'background-color': `var(--color-${props.value})` }}
      />
      <select
        aria-label={props.label}
        class="min-w-0 flex-1 appearance-none bg-transparent pr-1 font-mono text-[11px] outline-none"
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        <For each={TOKEN_OPTIONS}>
          {(token) => <option value={token}>{token}</option>}
        </For>
      </select>
      <button
        type="button"
        class="mr-1 grid size-5 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-ink/8 hover:text-ink"
        aria-label={`Remove ${props.label}`}
        onClick={props.onRemove}
      >
        <XIcon class="size-3" />
      </button>
    </div>
  );
}

function TokenSlider(props: {
  label: string;
  value: number;
  color: string;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = createSignal(props.value);
  createEffect(() => setDraft(props.value));

  const update = (event: Event, commit: boolean) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    setDraft(value);
    props.onPreview(value);
    if (commit) props.onCommit(value);
  };

  return (
    <label class="flex min-w-24 flex-1 items-center gap-2 text-[10px] text-ink-muted">
      <span class="w-8 shrink-0">{props.label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={draft()}
        aria-label={props.label}
        class="theme-token-slider h-1 min-w-16 flex-1 cursor-pointer appearance-none rounded-full"
        style={{
          '--slider-color': props.color,
          'accent-color': props.color,
          background: `linear-gradient(to right, ${props.color} ${draft() * 100}%, color-mix(in oklch, ${props.color} 15%, transparent) ${draft() * 100}%)`,
        }}
        onInput={(event) => update(event, false)}
        onChange={(event) => update(event, true)}
      />
      <span class="w-8 text-right font-mono">{Math.round(draft() * 100)}%</span>
    </label>
  );
}

function AssignmentControls(props: { token: string; value: string }) {
  const assignment = createMemo(() => parseThemeAssignment(props.value));
  const commit = (next: ThemeAssignment) =>
    updateLiveThemeColorToken(props.token, serializeThemeAssignment(next));
  const preview = (next: ThemeAssignment) =>
    document.documentElement.style.setProperty(
      `--color-${props.token}`,
      serializeThemeAssignment(next)
    );
  const makeCustom = () =>
    commit({ kind: 'custom', value: resolvedColor(props.token) });

  return (
    <div class="flex min-w-0 flex-wrap items-center justify-end gap-2">
      {(() => {
        const current = assignment();
        if (current.kind === 'custom') {
          return (
            <>
              <ColorControl
                token={props.token}
                value={current.value}
                onChange={(value) => commit({ kind: 'custom', value })}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  commit({ kind: 'linked', token: 'accent', alpha: 1 })
                }
              >
                <PlusIcon class="size-3" /> link
              </Button>
            </>
          );
        }

        if (current.kind === 'linked') {
          const withAlpha = (alpha: number): ThemeAssignment => ({
            ...current,
            alpha,
          });
          return (
            <>
              <TokenPill
                label={`${props.token} linked token`}
                value={current.token}
                onChange={(token) => commit({ ...current, token })}
                onRemove={makeCustom}
              />
              <TokenSlider
                label="Alpha"
                value={current.alpha}
                color={`var(--color-${current.token})`}
                onPreview={(alpha) => preview(withAlpha(alpha))}
                onCommit={(alpha) => commit(withAlpha(alpha))}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  commit({
                    kind: 'mixed',
                    first: current.token,
                    second: current.token === 'accent' ? 'content-0' : 'accent',
                    mix: 0.5,
                    alpha: current.alpha,
                  })
                }
              >
                <PlusIcon class="size-3" /> mix
              </Button>
            </>
          );
        }

        const withMix = (mix: number): ThemeAssignment => ({ ...current, mix });
        const withAlpha = (alpha: number): ThemeAssignment => ({
          ...current,
          alpha,
        });
        return (
          <>
            <TokenPill
              label={`${props.token} first mix token`}
              value={current.first}
              onChange={(first) => commit({ ...current, first })}
              onRemove={makeCustom}
            />
            <TokenSlider
              label="Mix"
              value={current.mix}
              color={`var(--color-${current.first})`}
              onPreview={(mix) => preview(withMix(mix))}
              onCommit={(mix) => commit(withMix(mix))}
            />
            <TokenPill
              label={`${props.token} second mix token`}
              value={current.second}
              onChange={(second) => commit({ ...current, second })}
              onRemove={() =>
                commit({
                  kind: 'linked',
                  token: current.first,
                  alpha: current.alpha,
                })
              }
            />
            <TokenSlider
              label="Alpha"
              value={current.alpha}
              color={`var(--color-${current.second})`}
              onPreview={(alpha) => preview(withAlpha(alpha))}
              onCommit={(alpha) => commit(withAlpha(alpha))}
            />
          </>
        );
      })()}
    </div>
  );
}

function TokenRow(props: { token: string }) {
  const value = () => themeColorTokens()[props.token] ?? 'transparent';
  return (
    <div class="grid min-h-12 grid-cols-[minmax(8rem,0.7fr)_2rem_minmax(14rem,2fr)] items-center gap-3 border-b border-edge-subtle px-3 py-2 last:border-b-0">
      <code class="truncate text-xs text-ink-muted">{props.token}</code>
      <div
        class="size-6 rounded-md border border-edge-muted"
        style={{ 'background-color': `var(--color-${props.token})` }}
        title={value()}
      />
      <AssignmentControls token={props.token} value={value()} />
    </div>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {props.title}
      </h3>
      <div class="overflow-hidden rounded-lg border border-edge-subtle bg-surface">
        {props.children}
      </div>
    </section>
  );
}

export function ThemeTokenEditor() {
  return (
    <>
      <style>{`
        .theme-token-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border: 2px solid var(--color-surface);
          border-radius: 999px;
          background: var(--slider-color);
          box-shadow: 0 1px 3px color-mix(in oklch, var(--color-ink) 25%, transparent);
        }
        .theme-token-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: 2px solid var(--color-surface);
          border-radius: 999px;
          background: var(--slider-color);
          box-shadow: 0 1px 3px color-mix(in oklch, var(--color-ink) 25%, transparent);
        }
      `}</style>
      <div class="flex flex-col gap-7">
        <Section title="Raw Tokens">
          <For each={rawGroups}>
            {(group) => (
              <div>
                <div class="bg-inset px-3 py-1.5 text-[11px] font-medium text-ink-subtle">
                  {group.label}
                </div>
                <For each={group.tokens}>
                  {(token) => <TokenRow token={token} />}
                </For>
              </div>
            )}
          </For>
        </Section>

        <Section title="Semantic Assignments">
          <For each={semanticTokens}>{(token) => <TokenRow token={token} />}</For>
        </Section>
      </div>
    </>
  );
}
