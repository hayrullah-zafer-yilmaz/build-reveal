import { complementaryCursors, createBuildReveal } from 'build-reveal';
import { defineBuildRevealElement } from 'build-reveal/element';
import { createTour } from 'build-reveal/tour';
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

const tour = createTour(
  [
    { target: '#invoice-search', caption: 'Type what you are looking for.', type: 'Northwind' },
    { target: '#invoice-filter', caption: 'Narrow the list down to this month.', click: true },
    { target: '.invoice-table tbody tr', caption: 'Matching invoices show up here.' },
    { target: '#invoice-export', caption: 'Export the list as a spreadsheet.', click: true }
  ],
  {
    cursor: { label: 'Guide' },
    onEnd: (completed) => console.info(`[tour] ${completed ? 'completed' : 'closed'}`)
  }
);

document.querySelector('#start-tour')!.addEventListener('click', () => tour.start());

const ordersTour = createTour(
  [
    { target: '#orders-search', caption: 'Look up an order by number or customer.', type: 'ORD-5521' },
    { target: '#orders-filter', caption: 'Show only the orders of the last 7 days.', click: true },
    { target: '#orders-table tbody tr', caption: 'Each row shows where the order is.' },
    { target: '#orders-export', caption: 'Export the orders as a spreadsheet.', click: true }
  ],
  { cursor: { label: 'Guide' } }
);

let tourAfterReveal = false;

function startOrdersTour() {
  tourAfterReveal = false;
  ordersTour.start();
}

const orders = createBuildReveal(document.querySelector<HTMLElement>('#orders-stage')!, {
  cursors: [{ label: 'Ada' }, { label: 'Linus' }],
  onComplete: () => {
    if (tourAfterReveal) startOrdersTour();
  }
});

document.querySelector('#start-reveal-tour')!.addEventListener('click', () => {
  if (ordersTour.active) return;
  if (orders.phase !== 'pending') {
    startOrdersTour();
    return;
  }
  tourAfterReveal = true;
  void orders.play();
});
