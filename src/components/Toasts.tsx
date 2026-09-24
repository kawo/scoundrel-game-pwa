import { td } from '../game/i18n.ts';
import type { Achievement } from '../game/achievements.ts';

export interface ToastItem {
  key: number;
  achievement: Achievement;
  leaving: boolean;
}

/**
 * Achievement toasts. Polite, so an unlock never cuts across the chronicle
 * announcing what just happened in the room. App owns the list and the timers.
 */
export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="toasts" id="toasts" role="status" aria-live="polite" aria-atomic="false">
      {items.map(({ key, achievement: a, leaving }) => (
        <div key={key} className="toast" data-kind={a.kind} data-leaving={leaving ? 'true' : undefined}>
          <span className="toast__mark" aria-hidden="true">★</span>
          <span className="toast__body">
            <b>{td(`ach.${a.id}.title`, a.title)}</b>
            <i>{td(`ach.${a.id}.desc`, a.desc)}</i>
          </span>
        </div>
      ))}
    </div>
  );
}
