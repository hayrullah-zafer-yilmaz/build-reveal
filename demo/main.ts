import { complementaryCursors, createBuildReveal } from 'build-reveal';
import { defineBuildRevealElement } from 'build-reveal/element';
import { markup } from './content';
import { mountReactDemo } from './react-demo';
import { mountVueDemo } from './vue-demo';

const vanillaStage = document.querySelector<HTMLElement>('#vanilla-stage')!;
vanillaStage.innerHTML = markup('Plain JavaScript');

const vanilla = createBuildReveal(vanillaStage, {
  cursors: [{ label: 'Ada' }, { label: 'Linus' }, { label: 'Grace' }],
  onComplete: () => console.info('[vanilla] complete')
});

defineBuildRevealElement();
const elementStage = document.querySelector('build-reveal')!;
elementStage.innerHTML = markup('Custom element');
elementStage.cursors = complementaryCursors(2);
elementStage.addEventListener('complete', () => console.info('[element] complete'));

const replays: Record<string, () => void> = {
  vanilla: () => void vanilla.play(),
  element: () => void elementStage.play()
};

document.querySelectorAll<HTMLButtonElement>('[data-replay]').forEach((button) => {
  button.addEventListener('click', () => replays[button.dataset.replay!]?.());
});

mountReactDemo(document.querySelector('#react-root')!);
mountVueDemo(document.querySelector('#vue-root')!);
