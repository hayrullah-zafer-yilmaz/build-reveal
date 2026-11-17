import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ObjectDirective,
  type PropType
} from 'vue';
import {
  createBuildReveal,
  type BuildReveal as BuildRevealInstance,
  type BuildRevealOptions,
  type BuildRevealTrigger
} from '../core/buildReveal';
import type { BuildCursor } from '../core/overlay';

export const BuildReveal = defineComponent({
  name: 'BuildReveal',
  props: {
    tag: { type: String, default: 'div' },
    cursors: { type: [Number, Array] as PropType<number | readonly BuildCursor[]>, default: 3 },
    speed: { type: Number, default: 1 },
    trigger: { type: String as PropType<BuildRevealTrigger>, default: 'visible' },
    progressive: { type: Boolean, default: false },
    hold: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  emits: {
    complete: () => true
  },
  setup(props, { slots, emit, expose }) {
    const stage = ref<HTMLElement | null>(null);
    let instance: BuildRevealInstance | null = null;

    const options = (): BuildRevealOptions => ({
      cursors: props.cursors,
      speed: props.speed,
      trigger: props.trigger,
      progressive: props.progressive,
      hold: props.hold,
      disabled: props.disabled
    });

    onMounted(() => {
      if (!stage.value) return;
      instance = createBuildReveal(stage.value, { ...options(), onComplete: () => emit('complete') });
    });

    watch(options, (next) => instance?.update(next), { flush: 'post' });

    onBeforeUnmount(() => {
      instance?.destroy();
      instance = null;
    });

    expose({
      play: () => instance?.play() ?? Promise.resolve(),
      finish: () => instance?.finish()
    });

    return () => h(props.tag, { ref: stage }, slots.default?.());
  }
});

type DirectiveValue = BuildRevealOptions | undefined;

const instances = new WeakMap<HTMLElement, BuildRevealInstance>();

export const vBuildReveal: ObjectDirective<HTMLElement, DirectiveValue> = {
  mounted(el, { value }) {
    instances.set(el, createBuildReveal(el, value ?? {}));
  },
  updated(el, { value }) {
    instances.get(el)?.update(value ?? {});
  },
  beforeUnmount(el) {
    instances.get(el)?.destroy();
    instances.delete(el);
  }
};
