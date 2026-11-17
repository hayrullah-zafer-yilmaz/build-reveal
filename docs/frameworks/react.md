# React & Next.js

Works with React 17 and later, in Strict Mode, and in the Next.js App Router.

## Component

```tsx
import { BuildReveal } from 'build-reveal/react';

export function Dashboard() {
  return (
    <BuildReveal className="dashboard" cursors={2}>
      <h1 data-build="type">Revenue</h1>
      <p data-build>Up 12% this month.</p>
      <Chart data-build />
    </BuildReveal>
  );
}
```

`<BuildReveal>` renders a `div` that is the stage. Use `as` to render another element, like `as="section"`. Every option is a prop, and other props (`className`, `style`, `id`, `aria-*`…) go to the element.

Your own components can be targets if they pass `data-build` on to a DOM element. If a component only accepts a `className`, give it `className="build-reveal-target"`.

## Replay, finish and onComplete

The `ref` gives you `play()` and `finish()`:

```tsx
import { useRef, useState } from 'react';
import { BuildReveal, type BuildRevealHandle } from 'build-reveal/react';

export function Dashboard() {
  const reveal = useRef<BuildRevealHandle>(null);
  const [ready, setReady] = useState(false);

  return (
    <>
      <button type="button" onClick={() => reveal.current?.play()}>
        Replay
      </button>
      <BuildReveal ref={reveal} onComplete={() => setReady(true)}>
        <h1 data-build="type">Revenue</h1>
      </BuildReveal>
      {ready && <p>All set.</p>}
    </>
  );
}
```

`onComplete` may change between renders; the latest one is always called.

## Hook

To keep your own element, pass a ref to `useBuildReveal`:

```tsx
import { useRef } from 'react';
import { useBuildReveal } from 'build-reveal/react';

export function Hero() {
  const stage = useRef<HTMLElement>(null);
  const { play } = useBuildReveal(stage, { speed: 1.2 });

  return (
    <section ref={stage} onDoubleClick={() => play()}>
      <h1 data-build="type">Welcome</h1>
    </section>
  );
}
```

The reveal is created when the element mounts and destroyed when it unmounts. Option changes are applied as they happen.

## Loading data

Turn on `hold` while data loads. Targets rendered in the meantime join the animation, and it finishes once `hold` is off:

```tsx
function Stats({ stats, loading }: { stats: Stat[]; loading: boolean }) {
  return (
    <BuildReveal hold={loading}>
      <h2 data-build="type">This month</h2>
      {stats.map((stat) => (
        <div key={stat.label} data-build>
          {stat.label}: {stat.value}
        </div>
      ))}
    </BuildReveal>
  );
}
```

## Next.js

The `build-reveal/react` entry is marked `'use client'`, so `<BuildReveal>` can be used directly in Server Components:

```tsx
// app/page.tsx
import { BuildReveal } from 'build-reveal/react';

export default function Page() {
  return (
    <BuildReveal cursors={2}>
      <h1 data-build="type">Welcome</h1>
    </BuildReveal>
  );
}
```

Server Components can't pass functions, so to use `onComplete` or a `ref`, put `<BuildReveal>` in your own Client Component (a file starting with `'use client'`).

**Server-rendered pages.** The page shows the server HTML first, and the targets are hidden when React hydrates. Content further down is hidden long before anyone scrolls to it. Content at the very top, though, may be visible for a moment before the animation starts. If that matters, render that part only in the browser:

```tsx
'use client';

import dynamic from 'next/dynamic';

const Hero = dynamic(() => import('./hero'), { ssr: false });
```

## Testing

jsdom (used by Jest and Vitest) has no `IntersectionObserver`, so the animation is skipped and everything is visible. If your test setup mocks `IntersectionObserver`, turn animations off there:

```ts
// vitest.setup.ts or jest.setup.ts
import { setBuildRevealEnabled } from 'build-reveal';

setBuildRevealEnabled(false);
```
