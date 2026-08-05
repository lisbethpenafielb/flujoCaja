import { h } from './dom';
import { icon } from './icons';
import { BRAND } from './palette';

/** Panel superior del Dashboard con el comentario tipo Controller — se
 *  regenera automáticamente en cada render a partir de `buildExecutiveSummary`
 *  (src/data/derived.ts), nunca se edita a mano. */
export function renderExecutiveSummary(text: string): HTMLElement {
  return h('div', { class: 'card px-5 py-4 flex items-start gap-3 animate-fade-in' }, [
    h(
      'span',
      {
        class: 'inline-flex items-center justify-center rounded-lg flex-shrink-0',
        style: `width:32px;height:32px;background:${BRAND.primary}14;color:${BRAND.primary};margin-top:1px`,
      },
      [icon('info', { size: 16 })]
    ),
    h('div', { class: 'min-w-0' }, [
      h(
        'p',
        { class: 'text-[10.5px] font-bold uppercase tracking-wide mb-1', style: `color:${BRAND.primary};letter-spacing:0.05em` },
        ['Resumen ejecutivo']
      ),
      h('p', { class: 'text-sm leading-relaxed', style: 'color:var(--ink-primary);max-width:92ch' }, [text]),
    ]),
  ]);
}
