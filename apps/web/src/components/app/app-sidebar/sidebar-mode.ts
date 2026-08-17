import { makePersisted } from '@solid-primitives/storage';
import { createSignal } from 'solid-js';

/** Which sidebar variant the app renders. */
export type SidebarMode = 'icon-rail' | 'full-text';

export const SIDEBAR_MODES: readonly {
  id: SidebarMode;
  label: string;
  description: string;
}[] = [
  {
    id: 'icon-rail',
    label: 'Icon Rail',
    description: 'Narrow bar of icons',
  },
  {
    id: 'full-text',
    label: 'Full Text',
    description: 'Classic sidebar with labels and sections',
  },
];

/**
 * Persisted sidebar variant. Module-level so the Layout (reader) and the
 * command menu's "Set Sidebar Mode" action (writer) share one signal.
 */
export const [sidebarMode, setSidebarMode] = makePersisted(
  createSignal<SidebarMode>('icon-rail'),
  { name: 'sidebar-mode' }
);
