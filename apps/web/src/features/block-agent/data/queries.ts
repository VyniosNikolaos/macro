import { foldSession } from '@core/agent-fold/client';
import { throwOnErr } from '@core/util/result';
import type { FoldedMessage } from '@service-agent-fold/generated/types';
import { storageServiceClient } from '@service-storage/client';
import type { AgentSessionResponse } from '@service-storage/generated/schemas/agentSessionResponse';
import { useQuery } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';

export type AgentSessionBlockData = {
  session: AgentSessionResponse;
  messages: FoldedMessage[];
};

export function agentSessionBlockQueryKey(sessionId: string): string[] {
  return ['agent-session', 'block', sessionId];
}

/**
 * One-shot load for the agent block: the session's metadata plus its whole
 * log, folded once. No live follow — a running session just looks frozen
 * until the block is reopened.
 */
export function useAgentSessionBlockQuery(sessionId: Accessor<string>) {
  return useQuery(() => {
    const currentId = sessionId();
    return {
      queryKey: agentSessionBlockQueryKey(currentId),
      queryFn: async (): Promise<AgentSessionBlockData> => {
        const session = await throwOnErr(() =>
          storageServiceClient.getAgentSession({ session_id: currentId })
        );
        const log = await throwOnErr(() =>
          storageServiceClient.getAgentChannelLog({
            channel_id: session.channelId,
          })
        );
        const messages = await foldSession(currentId, log.entries);
        return { session, messages };
      },
    };
  });
}
