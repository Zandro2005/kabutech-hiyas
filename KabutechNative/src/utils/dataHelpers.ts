import { BatchData, BagData, HarvestLogData } from '../types/firebase';

export interface RackStats {
  bags: BagData[];
  activeBags: BagData[];
  emptyBags: BagData[];
  flaggedBags: BagData[];
  totalYieldGrams: number;
  allHarvestLogs: HarvestLogData[];
  rackDay: number;
  status: 'GROWING' | 'COLONIZING' | 'FRUITING' | 'EMPTY';
}

export const getRackStats = (rack: BatchData): RackStats => {
  const bags = Array.isArray(rack.bags) ? rack.bags : Object.values(rack.bags || {});
  // Filter out any nullish values safely and strictly check for status
  const validBags = bags.filter((b): b is BagData => !!b && typeof b === 'object' && 'status' in b);
  
  const activeBags = validBags.filter(b => b.status === 'Active');
  const emptyBags = validBags.filter(b => b.status === 'Empty');
  const flaggedBags = validBags.filter(b => b.status === 'Contaminated');

  let totalYieldGrams = 0;
  const allHarvestLogs: HarvestLogData[] = [];
  
  validBags.forEach(b => {
    if (b.harvestLog) {
      const logs = Array.isArray(b.harvestLog) ? b.harvestLog : Object.values(b.harvestLog);
      logs.forEach(h => {
        if (h && typeof h.grams === 'number') {
          totalYieldGrams += h.grams;
          allHarvestLogs.push(h as HarvestLogData);
        }
      });
    }
  });

  if (rack.historicalHarvests) {
    const hist = Array.isArray(rack.historicalHarvests) ? rack.historicalHarvests : Object.values(rack.historicalHarvests);
    hist.forEach(h => {
      if (h && typeof h.grams === 'number') {
        totalYieldGrams += h.grams;
        allHarvestLogs.push(h as HarvestLogData);
      }
    });
  }

  let rackDay = 0;
  if (rack.setupDate) {
    const msDiff = Date.now() - new Date(rack.setupDate).getTime();
    rackDay = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    if (rackDay < 0) rackDay = 0;
  }

  let status: 'GROWING' | 'COLONIZING' | 'FRUITING' | 'EMPTY' = 'GROWING';
  if (rackDay < 14) status = 'COLONIZING';
  if (rackDay > 21) status = 'FRUITING';
  if (activeBags.length === 0) status = 'EMPTY';

  return {
    bags: validBags,
    activeBags,
    emptyBags,
    flaggedBags,
    totalYieldGrams,
    allHarvestLogs,
    rackDay,
    status
  };
};
