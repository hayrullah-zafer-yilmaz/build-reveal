import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject
} from 'react';
import {
  createBuildReveal,
  type BuildReveal as BuildRevealInstance,
  type BuildRevealOptions
} from '../core/buildReveal';

export interface BuildRevealHandle {
  play(): Promise<void>;
  finish(): void;
}

export interface BuildRevealProps
  extends BuildRevealOptions,
    Omit<HTMLAttributes<HTMLElement>, 'onComplete'> {
  as?: keyof HTMLElementTagNameMap;
  children?: ReactNode;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useBuildReveal(
  stageRef: RefObject<HTMLElement | null>,
  options: BuildRevealOptions = {}
): BuildRevealHandle {
  const instance = useRef<BuildRevealInstance | null>(null);
  const latest = useRef(options);
  latest.current = options;

  const { cursors, speed, trigger, progressive, hold, disabled } = options;

  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const created = createBuildReveal(stage, {
      ...latest.current,
      onComplete: () => latest.current.onComplete?.()
    });
    instance.current = created;

    return () => {
      created.destroy();
      instance.current = null;
    };
  }, [stageRef]);

  useEffect(() => {
    instance.current?.update({ cursors, speed, trigger, progressive, hold, disabled });
  }, [cursors, speed, trigger, progressive, hold, disabled]);

  return useMemo(
    () => ({
      play: () => instance.current?.play() ?? Promise.resolve(),
      finish: () => instance.current?.finish()
    }),
    []
  );
}

export const BuildReveal = forwardRef<BuildRevealHandle, BuildRevealProps>(function BuildReveal(
  { as = 'div', cursors, speed, trigger, progressive, hold, disabled, onComplete, children, ...rest },
  ref
) {
  const stageRef = useRef<HTMLElement>(null);
  const handle = useBuildReveal(stageRef, {
    cursors,
    speed,
    trigger,
    progressive,
    hold,
    disabled,
    onComplete
  });

  useImperativeHandle(ref, () => handle, [handle]);

  return createElement(as, { ...rest, ref: stageRef }, children);
});
