import { createApp, defineComponent, h, ref } from 'vue';
import { BuildReveal } from 'build-reveal/vue';
import { CHIPS, STATS } from './content';

const VueDemo = defineComponent({
  setup() {
    const reveal = ref<InstanceType<typeof BuildReveal> & { play(): Promise<void> }>();
    const runs = ref(0);

    return () => [
      h('div', { class: 'panel__actions' }, [
        h('button', { type: 'button', onClick: () => reveal.value?.play() }, 'Replay'),
        h('span', { class: 'runs' }, `completed ${runs.value}×`)
      ]),
      h(
        BuildReveal,
        {
          ref: reveal,
          class: 'stage',
          cursors: [{ label: 'Vue', color: '#10b981' }],
          speed: 1.4,
          onComplete: () => runs.value++
        },
        () => [
          h('div', { class: 'hero', 'data-build': '' }, [
            h('h3', { 'data-build': 'type' }, [
              'Vue component ',
              h('span', { class: 'gradient' }, 'in seconds')
            ]),
            h('p', { 'data-build': 'type' }, 'Use the component, or the v-build-reveal directive.')
          ]),
          h(
            'div',
            { class: 'stats' },
            STATS.map(({ label, value }) =>
              h('div', { key: label, class: 'stat', 'data-build': '' }, [
                h('span', { 'data-build': 'type' }, label),
                h('strong', { 'data-build': 'type' }, value)
              ])
            )
          ),
          h(
            'div',
            { class: 'actions' },
            CHIPS.map((chip) => h('span', { key: chip, class: 'chip', 'data-build': '' }, chip))
          )
        ]
      )
    ];
  }
});

export function mountVueDemo(container: HTMLElement) {
  createApp(VueDemo).mount(container);
}
