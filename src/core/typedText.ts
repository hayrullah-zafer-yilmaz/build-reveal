import { countReached, cumulativeShares, keystrokeWeight, WHITESPACE } from './keystrokes';

const UNTYPED_HIGHLIGHT = 'build-reveal-untyped';
const MASKED_ATTRIBUTE = 'data-build-masked';
const TYPED_WIDTH = '--build-reveal-typed';
const NON_TEXT = 'svg, style, script, [aria-hidden="true"], [data-build-skip], .material-icons, [class*="material-symbols"]';

interface TextPosition {
  node: Text;
  offset: number;
}

interface Keystroke extends TextPosition {
  length: number;
}

interface MaskedRun {
  el: HTMLElement;
  first: number;
  last: number;
  unmasked: boolean;
}

export interface TypedText {
  readonly length: number;
  begin(): void;
  update(progress: number): DOMRect | null;
  dispose(): void;
}

const supportsTyping =
  typeof Highlight === 'function' && typeof CSS !== 'undefined' && 'highlights' in CSS;

let untypedRanges: Highlight | null = null;

function untypedHighlight() {
  if (!untypedRanges) {
    untypedRanges = new Highlight();
    CSS.highlights.set(UNTYPED_HIGHLIGHT, untypedRanges);
  }
  return untypedRanges;
}

function textNodesOf(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const skipped = node.parentElement?.closest(NON_TEXT);
      return skipped && root.contains(skipped)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

function paintsTextWithBackground(el: Element) {
  const style = getComputedStyle(el);
  return (
    style.backgroundClip === 'text' || style.getPropertyValue('-webkit-background-clip') === 'text'
  );
}

function maskedRunsOf(root: HTMLElement, keystrokes: Keystroke[]): MaskedRun[] {
  return [root, ...root.querySelectorAll<HTMLElement>('*')]
    .filter(paintsTextWithBackground)
    .map((el) => {
      const inside = keystrokes.flatMap(({ node }, index) => (el.contains(node) ? [index] : []));
      return { el, first: inside[0] ?? -1, last: inside.at(-1) ?? -1, unmasked: false };
    })
    .filter((run) => run.first >= 0);
}

function lineOffsetOf(el: HTMLElement, caret: DOMRect) {
  const middle = caret.top + caret.height / 2;
  let offset = 0;

  for (const line of el.getClientRects()) {
    if (middle >= line.top && middle <= line.bottom) {
      return offset + Math.min(Math.max(caret.left - line.left, 0), line.width);
    }
    offset += line.width;
  }

  return offset;
}

function caretRectOf(range: Range) {
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : (range.getClientRects()[0] ?? null);
}

function setRangeStart(range: Range, { node, offset }: TextPosition) {
  range.setStart(node, Math.min(offset, node.length));
}

function unmask(el: HTMLElement) {
  el.removeAttribute(MASKED_ATTRIBUTE);
  el.style.removeProperty(TYPED_WIDTH);
  if (el.getAttribute('style') === '') el.removeAttribute('style');
}

export function createTypedText(root: HTMLElement): TypedText | null {
  if (!supportsTyping) return null;

  const keystrokes: Keystroke[] = [];
  const weights: number[] = [];
  let previous = '';

  for (const node of textNodesOf(root)) {
    let offset = 0;

    for (const character of node.data) {
      if (!WHITESPACE.test(character)) {
        keystrokes.push({ node, offset, length: character.length });
        weights.push(keystrokeWeight(previous, weights.length));
      }
      previous = character;
      offset += character.length;
    }
  }

  const first = keystrokes[0];
  if (!first) return null;

  const boundaries: TextPosition[] = [
    first,
    ...keystrokes.map(({ node, offset, length }) => ({ node, offset: offset + length }))
  ];
  const thresholds = cumulativeShares(weights);
  const maskedRuns = maskedRunsOf(root, keystrokes);
  const untyped = new Range();
  const caret = new Range();
  let shown = -1;

  function showUpTo(typed: number) {
    const boundary = boundaries[typed]!;
    setRangeStart(untyped, boundary);
    setRangeStart(caret, boundary);
    caret.collapse(true);
    shown = typed;
  }

  function updateMasks(typed: number, caretRect: DOMRect | null) {
    for (const run of maskedRuns) {
      if (run.unmasked) continue;

      if (typed > run.last) {
        unmask(run.el);
        run.unmasked = true;
      } else {
        const width = typed > run.first && caretRect ? lineOffsetOf(run.el, caretRect) : 0;
        run.el.style.setProperty(TYPED_WIDTH, `${width}px`);
      }
    }
  }

  return {
    length: keystrokes.length,

    begin() {
      setRangeStart(untyped, first);
      untyped.setEnd(root, root.childNodes.length);
      untypedHighlight().add(untyped);
      maskedRuns.forEach(({ el }) => el.setAttribute(MASKED_ATTRIBUTE, ''));
    },

    update(progress) {
      const typed = countReached(thresholds, progress);
      if (typed !== shown) showUpTo(typed);

      const caretRect = typed < keystrokes.length ? caretRectOf(caret) : null;
      updateMasks(typed, caretRect);
      return caretRect;
    },

    dispose() {
      untypedHighlight().delete(untyped);
      maskedRuns.forEach(({ el }) => unmask(el));
    }
  };
}
