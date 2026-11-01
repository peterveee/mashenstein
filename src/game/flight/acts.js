// Which stages end in a flight, and what each ending says. The run, the flight,
// the save record and the campaign routing all read this table; nothing else
// should name a stage id to decide it is an act ending.
export const ACT_ENDINGS = {
  'rhythm-3': {
    stageId: 'rhythm-3', cabinet: 'rhythm', act: 1, label: '3-3',
    hudTitle: '3-3 · BONK TO THE BEAT',
    bankText: 'FIRST POWER BANK ONLINE', completeText: 'ACT I COMPLETE', bank: 1,
  },
  'neon-3': {
    stageId: 'neon-3', cabinet: 'neon', act: 2, label: '6-3',
    hudTitle: '6-3 · AIR FARE',
    bankText: 'SECOND POWER BANK ONLINE', completeText: 'ACT II COMPLETE', bank: 2,
  },
  // Act III: the balloon (Peter's 4 Sep pick), its pop the false defeat, then
  // BACKUP POWER with its own checkpoint; the win is the arcade's power back,
  // and the finale, the first time.
  'surge-3': {
    stageId: 'surge-3', cabinet: 'surge', act: 3, label: '9-3',
    hudTitle: '9-3 · ONE LAST MASH',
    bankText: 'ALL POWER RESTORED', completeText: 'ACT III COMPLETE', bank: 3,
    vehicle: 'balloon', finale: true,
  },
};

export function actEndingFor(stageId) {
  return (stageId && ACT_ENDINGS[stageId]) || null;
}
