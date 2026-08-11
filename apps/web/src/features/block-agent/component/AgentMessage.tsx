/**
 * Renders one folded agent-session message from the block-agent ui library:
 * prose and thoughts as before, tool calls as collapsible `ToolCard`s with
 * detail-specific bodies (Pierre-rendered diffs, ANSI terminals, path lists).
 *
 * The block-scoped sibling of the channel's `FoldedContent`, sharing its pure
 * helpers (`FoldedTerminal`, `FoldedPathList`, `FoldedOutput`) but not its
 * message chrome.
 */

import { FoldedOutput } from '@channel/Message/FoldedOutput';
import { FoldedPathList } from '@channel/Message/FoldedPathList';
import { FoldedTerminal } from '@channel/Message/FoldedTerminal';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { channelTheme } from '@core/component/LexicalMarkdown/theme';
import Brain from '@phosphor/brain.svg';
import FileText from '@phosphor/file-text.svg';
import MagnifyingGlass from '@phosphor/magnifying-glass.svg';
import PencilSimple from '@phosphor/pencil-simple.svg';
import ShieldCheck from '@phosphor/shield-check.svg';
import Terminal from '@phosphor/terminal.svg';
import Wrench from '@phosphor/wrench.svg';
import type {
  FoldedMessage,
  FoldedMessagePart,
  ToolDetail,
} from '@service-agent-fold/generated/types';
import { diffLines } from 'diff';
import { For, type JSX, Show } from 'solid-js';
import { match } from 'ts-pattern';
import { DiffChanges, PierreDiff, ToolCard, ToolErrorCard } from '../ui';

/** Sum added/removed lines across a call's file diffs for the +/− badge. */
function countDiffChanges(
  diffs: { oldText?: string | null; newText: string }[]
) {
  let additions = 0;
  let deletions = 0;
  for (const diff of diffs) {
    for (const change of diffLines(diff.oldText ?? '', diff.newText)) {
      if (change.added) additions += change.count ?? 0;
      if (change.removed) deletions += change.count ?? 0;
    }
  }
  return { additions, deletions };
}

/** Subtitle for a call that touched paths: the path, or how many. */
function pathsSubtitle(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  if (paths.length === 1) return paths[0];
  return `${paths.length} files`;
}

function ToolUse(props: {
  part: Extract<FoldedMessagePart, { kind: 'tool_use' }>;
}) {
  const failed = () => props.part.status === 'failed';

  const card = (detail: ToolDetail): JSX.Element =>
    match(detail)
      .with({ kind: 'terminal' }, (detail) => (
        <ToolCard
          icon={<Terminal />}
          title={props.part.label}
          subtitle={detail.command ?? undefined}
          status={props.part.status}
        >
          <Show when={detail.output}>
            {(output) => (
              <FoldedTerminal output={output()} exitCode={detail.exitCode} />
            )}
          </Show>
        </ToolCard>
      ))
      .with({ kind: 'edit' }, (detail) => {
        const changes = countDiffChanges(detail.diffs);
        return (
          <ToolCard
            icon={<PencilSimple />}
            title={props.part.label}
            subtitle={pathsSubtitle(detail.diffs.map((diff) => diff.path))}
            trailing={<DiffChanges {...changes} />}
            status={props.part.status}
          >
            <Show when={detail.diffs.length > 0}>
              <PierreDiff diffs={detail.diffs} />
            </Show>
          </ToolCard>
        );
      })
      .with(
        { kind: 'read' },
        { kind: 'delete' },
        { kind: 'move' },
        (detail) => (
          <ToolCard
            icon={<FileText />}
            title={props.part.label}
            subtitle={pathsSubtitle(detail.paths)}
            status={props.part.status}
          >
            <Show when={detail.paths.length > 1}>
              <FoldedPathList paths={detail.paths} />
            </Show>
          </ToolCard>
        )
      )
      .with({ kind: 'search' }, (detail) => (
        <ToolCard
          icon={<MagnifyingGlass />}
          title={props.part.label}
          subtitle={pathsSubtitle(detail.paths)}
          status={props.part.status}
        >
          <Show when={detail.output}>
            {(output) => <FoldedOutput text={output()} />}
          </Show>
        </ToolCard>
      ))
      .with({ kind: 'fetch' }, { kind: 'think' }, (detail) => (
        <ToolCard
          icon={detail.kind === 'think' ? <Brain /> : <Wrench />}
          title={props.part.label}
          status={props.part.status}
        >
          <Show when={detail.output}>
            {(output) => <FoldedOutput text={output()} />}
          </Show>
        </ToolCard>
      ))
      .with({ kind: 'other' }, (detail) => (
        <ToolCard
          icon={<Wrench />}
          title={props.part.label}
          status={props.part.status}
        >
          <Show when={detail.output}>
            {(output) => <FoldedOutput text={output()} />}
          </Show>
        </ToolCard>
      ))
      .exhaustive();

  return (
    <Show
      when={!failed()}
      fallback={
        <ToolErrorCard
          tool={props.part.label}
          error={outputOf(props.part.detail) ?? 'The tool call failed.'}
        />
      }
    >
      {card(props.part.detail)}
    </Show>
  );
}

/** Whatever text a detail carries, for the failure card's body. */
function outputOf(detail: ToolDetail): string | undefined {
  if ('output' in detail && detail.output) return detail.output;
  return undefined;
}

function Thought(props: { text: string }) {
  return (
    <div class="relative text-xs leading-5 text-ink-extra-muted">
      <div class="flex min-h-7 items-center gap-1 py-1">
        <Brain class="size-4 shrink-0" />
        <span>Thought</span>
      </div>
      <div class="pl-5 text-ink-muted whitespace-pre-wrap wrap-break-word">
        {props.text}
      </div>
    </div>
  );
}

function Permission(props: {
  part: Extract<FoldedMessagePart, { kind: 'permission' }>;
}) {
  const outcome = () => {
    const resolved = props.part.outcome;
    if (!resolved) return undefined;
    if (resolved.kind === 'cancelled') return 'Cancelled';
    const chosen = props.part.options.find(
      (option) => option.id === resolved.optionId
    );
    return chosen?.name ?? 'Answered';
  };

  return (
    <ToolCard
      icon={<ShieldCheck />}
      title="Permission requested"
      trailing={
        <Show when={outcome()}>
          {(label) => <span class="text-ink">{label()}</span>}
        </Show>
      }
      status="completed"
    />
  );
}

function AgentMessagePart(props: { part: FoldedMessagePart }): JSX.Element {
  return match(props.part)
    .with({ kind: 'text' }, (part) => (
      <div class="whitespace-pre-wrap wrap-break-word max-w-full text-sm">
        <StaticMarkdown
          markdown={part.text}
          theme={channelTheme}
          target="internal"
        />
      </div>
    ))
    .with({ kind: 'thought' }, (part) => <Thought text={part.text} />)
    .with({ kind: 'tool_use' }, (part) => <ToolUse part={part} />)
    .with({ kind: 'permission' }, (part) => <Permission part={part} />)
    .exhaustive();
}

export function AgentMessage(props: { folded: FoldedMessage }) {
  return (
    <div class="flex flex-col gap-1 min-w-0">
      <For each={props.folded.parts}>
        {(part) => <AgentMessagePart part={part} />}
      </For>
    </div>
  );
}
