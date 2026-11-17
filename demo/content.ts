export const STATS = [
  { label: 'Revenue', value: '$48.2k' },
  { label: 'Active users', value: '2,914' },
  { label: 'Conversion', value: '3.8%' }
];

export const CHIPS = ['Design', 'Build', 'Ship'];

export const markup = (title: string) => `
  <div class="hero" data-build>
    <h3 data-build="type">${title} <span class="gradient">in seconds</span></h3>
    <p data-build="type">Virtual cursors draw a frame around each element, then reveal it.</p>
  </div>
  <div class="stats">
    ${STATS.map(
      ({ label, value }) => `
      <div class="stat" data-build>
        <span data-build="type">${label}</span>
        <strong data-build="type">${value}</strong>
      </div>`
    ).join('')}
  </div>
  <div class="actions">
    ${CHIPS.map((chip) => `<span class="chip" data-build>${chip}</span>`).join('')}
  </div>
`;
