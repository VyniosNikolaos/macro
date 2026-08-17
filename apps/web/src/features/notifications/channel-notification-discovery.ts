import { compareDateDesc } from '@core/util/date';
import {
  type ChannelEntity,
  type EntityData,
  isChannelEntity,
} from '@entity/types/entity';
import type { UnifiedNotification } from '@notifications/types';
import type { Accessor } from 'solid-js';

const CHANNEL_NOTIFICATION_TYPES = new Set([
  'channel_mention',
  'channel_message_send',
  'channel_message_reply',
]);

type EntityNotificationAttachment = {
  notifications?:
    | UnifiedNotification[]
    | Accessor<UnifiedNotification[] | null | undefined>;
};

/** A channel entity paired with its unread channel notifications, newest first. */
export interface ChannelNotificationSummary {
  entity: ChannelEntity;
  unread: UnifiedNotification[];
}

/** Read notifications attached directly to a GraphQL Soup entity. */
function attachedNotifications(entity: EntityData): UnifiedNotification[] {
  const attachment = (entity as EntityData & EntityNotificationAttachment)
    .notifications;
  if (typeof attachment === 'function') return attachment() ?? [];
  return Array.isArray(attachment) ? attachment : [];
}

/** Return a channel entity's unread channel notifications, newest first. */
export function unreadChannelNotifications(
  entity: ChannelEntity
): UnifiedNotification[] {
  return attachedNotifications(entity)
    .filter(
      (notification) =>
        CHANNEL_NOTIFICATION_TYPES.has(
          notification.notification_metadata.tag
        ) &&
        !notification.viewed_at &&
        !notification.done
    )
    .sort((left, right) => compareDateDesc(left.created_at, right.created_at));
}

/** Group authoritative unread notification edges by channel ID. */
export function unreadNotificationsByChannel(
  entities: readonly EntityData[]
): ReadonlyMap<string, UnifiedNotification[]> {
  const notificationsByChannel = new Map<string, UnifiedNotification[]>();
  for (const entity of entities) {
    if (!isChannelEntity(entity)) continue;
    const unread = unreadChannelNotifications(entity);
    if (unread.length > 0) notificationsByChannel.set(entity.id, unread);
  }
  return notificationsByChannel;
}

/**
 * Merge the bounded recent-channel window with the independently paginated
 * unread-channel query. Candidate rows without an actually unread attached
 * notification are ignored because the server's seen/done predicates are
 * independent EXISTS clauses and intentionally form a superset.
 */
export function mergeRecentAndUnreadChannels(
  recentEntities: readonly EntityData[],
  unreadCandidateEntities: readonly EntityData[]
): ChannelNotificationSummary[] {
  const channelsById = new Map<string, ChannelNotificationSummary>();

  for (const entity of recentEntities) {
    if (!isChannelEntity(entity)) continue;
    channelsById.set(entity.id, {
      entity,
      unread: unreadChannelNotifications(entity),
    });
  }

  for (const entity of unreadCandidateEntities) {
    if (!isChannelEntity(entity)) continue;
    const unread = unreadChannelNotifications(entity);
    if (unread.length === 0) continue;
    channelsById.set(entity.id, { entity, unread });
  }

  const channels = [...channelsById.values()];
  channels.sort((left, right) =>
    compareDateDesc(
      left.entity.sortTs ?? left.entity.updatedAt,
      right.entity.sortTs ?? right.entity.updatedAt
    )
  );

  return [
    ...channels.filter((channel) => channel.unread.length > 0),
    ...channels.filter((channel) => channel.unread.length === 0),
  ];
}
