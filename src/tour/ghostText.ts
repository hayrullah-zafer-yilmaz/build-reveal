import { sheetOf } from '../core/drawingStyles';
import type { Box } from '../core/motion';
import type { TextField } from './targets';

interface Sides {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GhostSource {
  field: TextField;
  multiline: boolean;
  secret: boolean;
  style: readonly (readonly [string, string])[];
  borders: Sides;
  padding: Sides;
}

const TYPING_ATTRIBUTE = 'data-build-tour-typing';
const SECRET_CHARACTER = '•';
const COPIED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant',
  'font-feature-settings',
  'font-variation-settings',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'text-align',
  'direction',
  'line-height',
  'color'
];
const PLACEHOLDER_CSS = `
[${TYPING_ATTRIBUTE}]::placeholder {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  opacity: 0 !important;
}
`;

let placeholderSheet: CSSStyleSheet | null = null;

const pixels = (value: string) => parseFloat(value) || 0;

export function ghostSourceOf(field: TextField): GhostSource {
  const computed = getComputedStyle(field);

  return {
    field,
    multiline: field instanceof HTMLTextAreaElement,
    secret: field instanceof HTMLInputElement && field.type === 'password',
    style: COPIED_PROPERTIES.map((name) => [name, computed.getPropertyValue(name)] as const),
    borders: {
      left: pixels(computed.borderLeftWidth),
      top: pixels(computed.borderTopWidth),
      right: pixels(computed.borderRightWidth),
      bottom: pixels(computed.borderBottomWidth)
    },
    padding: {
      left: pixels(computed.paddingLeft),
      top: pixels(computed.paddingTop),
      right: pixels(computed.paddingRight),
      bottom: pixels(computed.paddingBottom)
    }
  };
}

export function contentBoxOf({ field, multiline, borders, padding }: GhostSource): Box {
  const rect = field.getBoundingClientRect();
  const width = field.offsetWidth || rect.width;
  const height = field.offsetHeight || rect.height;
  const scaleX = width ? rect.width / width : 1;
  const scaleY = height ? rect.height / height : 1;
  const scrollbar =
    multiline && field.clientWidth ? Math.max(0, width - borders.left - borders.right - field.clientWidth) : 0;

  return {
    x: rect.left + (borders.left + padding.left) * scaleX,
    y: rect.top + (borders.top + padding.top) * scaleY,
    width: Math.max(0, width - borders.left - borders.right - padding.left - padding.right - scrollbar) * scaleX,
    height: Math.max(0, height - borders.top - borders.bottom - padding.top - padding.bottom) * scaleY
  };
}

export function displayedText(source: GhostSource, text: string) {
  return source.secret ? SECRET_CHARACTER.repeat([...text].length) : text;
}

export function canTypeInto(source: GhostSource) {
  return source.field.isConnected && source.field.value === '';
}

export function hidePlaceholder(field: TextField) {
  const root = field.getRootNode();
  const scope = root instanceof ShadowRoot ? root : document;
  placeholderSheet ??= sheetOf(PLACEHOLDER_CSS);
  if (!scope.adoptedStyleSheets.includes(placeholderSheet)) {
    scope.adoptedStyleSheets = [...scope.adoptedStyleSheets, placeholderSheet];
  }

  field.setAttribute(TYPING_ATTRIBUTE, '');
  return () => field.removeAttribute(TYPING_ATTRIBUTE);
}
