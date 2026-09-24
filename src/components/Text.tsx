import { createElement, type ElementType } from 'react';
import { t } from '../game/i18n.ts';

interface HtmlProps {
  /** Translation key whose string carries a little markup (<b>, <kbd>…). */
  k: string;
  as?: ElementType;
  className?: string;
  id?: string;
}

/**
 * A translated string that contains markup. Only ever our own strings from
 * i18n.ts — never user input — so rendering them as HTML is safe.
 */
export function Html({ k, as = 'span', ...rest }: HtmlProps) {
  return createElement(as, { ...rest, dangerouslySetInnerHTML: { __html: t(k) } });
}
