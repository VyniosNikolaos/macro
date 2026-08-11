import { useBlockId } from '@core/block';
import { Scroll } from '@ui';
import { For, Show } from 'solid-js';

import { useAgentSessionBlockQuery } from '../data/queries';
import { AgentMessage } from './AgentMessage';

function statusLabel(status: { kind: string; event?: string }): string {
  return status.kind === 'event' && status.event
    ? `event: ${status.event}`
    : status.kind;
}

function AgentBlockContent(props: { sessionId: string }) {
  const query = useAgentSessionBlockQuery(() => props.sessionId);

  return (
    <div class="size-full overflow-hidden flex flex-col">
      <Show when={query.data}>
        {(data) => (
          <div class="shrink-0 px-4 py-3 border-b border-edge-muted text-sm">
            <div class="font-medium text-ink">{data().session.harness}</div>
            <div class="text-ink-muted">
              {data().session.model} · {statusLabel(data().session.status)}
            </div>
          </div>
        )}
      </Show>
      <Scroll class="flex-1 min-h-0">
        <div class="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4 min-w-0">
          <Show when={query.isError}>
            <div class="text-sm text-ink-muted">
              Couldn't load this agent session.
            </div>
          </Show>
          <For each={query.data?.messages}>
            {(message) => <AgentMessage folded={message} />}
          </For>
        </div>
      </Scroll>
    </div>
  );
}

export default function BlockAgent() {
  const blockId = useBlockId();

  return (
    <Show when={blockId}>{(id) => <AgentBlockContent sessionId={id()} />}</Show>
  );
}
