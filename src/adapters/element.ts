import {
  createBuildReveal,
  type BuildReveal,
  type BuildRevealOptions,
  type BuildRevealPhase,
  type BuildRevealTrigger
} from '../core/buildReveal';
import type { BuildCursor } from '../core/overlay';

export interface BuildRevealElement extends HTMLElement {
  cursors: number | readonly BuildCursor[] | undefined;
  speed: number;
  trigger: BuildRevealTrigger;
  progressive: boolean;
  hold: boolean;
  disabled: boolean;
  readonly phase: BuildRevealPhase;
  play(): Promise<void>;
  finish(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'build-reveal': BuildRevealElement;
  }
}

const BOOLEAN_ATTRIBUTES = ['progressive', 'hold', 'disabled'] as const;
const OBSERVED_ATTRIBUTES = ['cursors', 'speed', 'trigger', ...BOOLEAN_ATTRIBUTES];

const DEFAULT_CURSORS = 3;
const DEFAULT_SPEED = 1;
const DEFAULT_TRIGGER: BuildRevealTrigger = 'visible';

export const BUILD_REVEAL_COMPLETE_EVENT = 'complete';

function numberAttribute(value: string | null) {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function triggerAttribute(value: string | null): BuildRevealTrigger | undefined {
  return value === 'manual' || value === 'visible' ? value : undefined;
}

function reflect(el: HTMLElement, name: string, value: unknown) {
  if (value === undefined || value === null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? '' : String(value));
}

function createElementClass(): CustomElementConstructor {
  return class extends HTMLElement implements BuildRevealElement {
    static readonly observedAttributes = OBSERVED_ATTRIBUTES;

    #instance: BuildReveal | null = null;
    #cursorList: readonly BuildCursor[] | null = null;

    get cursors(): number | readonly BuildCursor[] | undefined {
      return this.#cursorList ?? numberAttribute(this.getAttribute('cursors'));
    }

    set cursors(value: number | readonly BuildCursor[] | undefined) {
      if (Array.isArray(value)) {
        this.#cursorList = value;
        this.#instance?.update({ cursors: value });
        return;
      }
      this.#cursorList = null;
      reflect(this, 'cursors', value);
    }

    get speed() {
      return numberAttribute(this.getAttribute('speed')) ?? DEFAULT_SPEED;
    }

    set speed(value: number) {
      reflect(this, 'speed', value);
    }

    get trigger() {
      return triggerAttribute(this.getAttribute('trigger')) ?? DEFAULT_TRIGGER;
    }

    set trigger(value: BuildRevealTrigger) {
      reflect(this, 'trigger', value);
    }

    get progressive() {
      return this.hasAttribute('progressive');
    }

    set progressive(value: boolean) {
      reflect(this, 'progressive', Boolean(value));
    }

    get hold() {
      return this.hasAttribute('hold');
    }

    set hold(value: boolean) {
      reflect(this, 'hold', Boolean(value));
    }

    get disabled() {
      return this.hasAttribute('disabled');
    }

    set disabled(value: boolean) {
      reflect(this, 'disabled', Boolean(value));
    }

    get phase() {
      return this.#instance?.phase ?? 'idle';
    }

    play() {
      return this.#instance?.play() ?? Promise.resolve();
    }

    finish() {
      this.#instance?.finish();
    }

    connectedCallback() {
      this.#upgradeProperties();
      this.#instance ??= createBuildReveal(this, {
        ...this.#options(),
        onComplete: () => this.dispatchEvent(new CustomEvent(BUILD_REVEAL_COMPLETE_EVENT))
      });
    }

    disconnectedCallback() {
      this.#instance?.destroy();
      this.#instance = null;
    }

    attributeChangedCallback() {
      this.#instance?.update(this.#options());
    }

    #upgradeProperties() {
      const own = this as unknown as Record<string, unknown>;

      for (const name of OBSERVED_ATTRIBUTES) {
        if (!Object.hasOwn(own, name)) continue;
        const value = own[name];
        delete own[name];
        own[name] = value;
      }
    }

    #options(): BuildRevealOptions {
      return {
        cursors: this.cursors ?? DEFAULT_CURSORS,
        speed: this.speed,
        trigger: this.trigger,
        progressive: this.progressive,
        hold: this.hold,
        disabled: this.disabled
      };
    }
  };
}

export function defineBuildRevealElement(tagName = 'build-reveal') {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) customElements.define(tagName, createElementClass());
}
