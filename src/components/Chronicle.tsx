import { useEffect, useRef } from 'react';
import { t } from '../game/i18n.ts';
import type { LogEntry } from '../game/types.ts';
import { logText } from '../labels.ts';

/**
 * The running log of the run.
 *
 * Rows are keyed by their monotonic entry id, so React only ever appends the
 * new ones — the aria-live region announces the one thing that just happened
 * rather than the whole history. A language change re-renders the text of the
 * existing rows in place (entries are keys, not sentences), which
 * aria-relevant="additions" does not re-announce.
 */
export function Chronicle({ log }: { log: LogEntry[] }) {
  const list = useRef<HTMLOListElement>(null);
  const newest = log.length ? log[log.length - 1].id : 0;

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [newest]);

  return (
    <section className="log-wrap" aria-labelledby="logHeading">
      <h2 id="logHeading">{t('log.heading')}</h2>
      <ol
        className="log"
        id="log"
        ref={list}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        aria-labelledby="logHeading"
      >
        {log.map((entry) => (
          <li key={entry.id} className="log__row" data-kind={entry.kind}>
            <span className="log__turn" aria-hidden="true">{entry.turn}</span>
            <span className="log__text">{logText(entry)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
