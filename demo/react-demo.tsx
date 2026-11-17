import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BuildReveal, type BuildRevealHandle } from 'build-reveal/react';
import { CHIPS, STATS } from './content';

function ReactDemo() {
  const reveal = useRef<BuildRevealHandle>(null);
  const [runs, setRuns] = useState(0);

  return (
    <>
      <div className="panel__actions">
        <button type="button" onClick={() => void reveal.current?.play()}>
          Replay
        </button>
        <span className="runs">completed {runs}×</span>
      </div>
      <BuildReveal
        ref={reveal}
        className="stage"
        cursors={[{ label: 'React', color: '#0ea5e9' }, { label: 'Hooks', color: '#14b8a6' }]}
        onComplete={() => setRuns((count) => count + 1)}
      >
        <div className="hero" data-build="">
          <h3 data-build="type">
            React component <span className="gradient">in seconds</span>
          </h3>
          <p data-build="type">Same engine, wrapped in a component with an imperative handle.</p>
        </div>
        <div className="stats">
          {STATS.map(({ label, value }) => (
            <div key={label} className="stat" data-build="">
              <span data-build="type">{label}</span>
              <strong data-build="type">{value}</strong>
            </div>
          ))}
        </div>
        <div className="actions">
          {CHIPS.map((chip) => (
            <span key={chip} className="chip" data-build="">
              {chip}
            </span>
          ))}
        </div>
      </BuildReveal>
    </>
  );
}

export function mountReactDemo(container: HTMLElement) {
  createRoot(container).render(
    <StrictMode>
      <ReactDemo />
    </StrictMode>
  );
}
