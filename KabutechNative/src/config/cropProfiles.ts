export interface LiteratureCitation {
  citation: string;
  authors: string;
  year: number;
  finding: string;
}

export interface ParamRange {
  min?: number;
  max?: number;
  criticalMargin: number; // Deviation past min/max to trigger critical tier
  unit: string;
  source: string; // Compact citation string for badges / compact text
  refs: string[]; // Specific citation keys
  description?: string;
}

export interface CropProfile {
  id: string;
  name: string;
  scientificName?: string;
  stage: 'fruiting' | 'colonization';
  temp: ParamRange;
  hum: ParamRange;
  co2: ParamRange;
  light: ParamRange;
  literatureSynthesis?: string;
  allReferences?: LiteratureCitation[];
}

export const CROP_REFERENCES: LiteratureCitation[] = [
  {
    citation: 'Islam et al. (2022)',
    authors: 'Islam, M. S., et al.',
    year: 2022,
    finding: 'Maintains that optimal temperature (18°C–24°C) and relative humidity (80%–95%) are continuously critical for healthy mycelial colonization and proper fruiting body formation.',
  },
  {
    citation: 'Hu et al. (2023)',
    authors: 'Hu, Y., et al.',
    year: 2023,
    finding: 'Finds through rigorous testing that strictly moderate temperatures around 20°C–25°C are required to prevent thermal stress and subsequent yield reduction in Pleurotus ostreatus.',
  },
  {
    citation: 'Girmay et al. (2016)',
    authors: 'Girmay, Z., et al.',
    year: 2016,
    finding: 'Demonstrates that even minor thermal variations significantly impact mycelial vigor, substrate-degrading enzyme activity, and overall biological efficiency.',
  },
  {
    citation: 'Chong et al. (2023)',
    authors: 'Chong, K. L., et al.',
    year: 2023,
    finding: 'Validates that multi-sensor IoT frameworks directly improve crop yield and actively prevent the desiccation of developing basidiocarps in small-scale mushroom cultivation.',
  },
  {
    citation: 'Bellettini et al. (2019)',
    authors: 'Bellettini, M. B., et al.',
    year: 2019,
    finding: 'Establishes that CO₂ levels must be reduced below 1,000 ppm during fruiting for proper morphogenesis; specifies diffused light of 150–500 lux (8–12h daily) for primordia initiation, warning that excessive illumination > 1,000 lux causes pileus discoloration and dehydration.',
  },
  {
    citation: 'Mohammed et al. (2018)',
    authors: 'Mohammed, A., et al.',
    year: 2018,
    finding: 'Warns that heavy CO₂ accumulation emitted during active fungal respiration rapidly deforms mushrooms, resulting in elongated stipes and rudimentary, unmarketable caps.',
  },
  {
    citation: 'Lin et al. (2022)',
    authors: 'Lin, Y., et al.',
    year: 2022,
    finding: 'Proteomic analyses reveal that poor indoor ventilation exceeding 2,000 ppm of CO₂ directly inhibits cap expansion and alters cellular morphology in Pleurotus ostreatus.',
  },
  {
    citation: 'Arjona et al. (2009)',
    authors: 'Arjona, D., et al.',
    year: 2009,
    finding: 'Establishes through controlled in vitro trials that reproducible photoperiods and regulated ambient light intensity are essential environmental triggers for initiating primordia differentiation.',
  },
];

export const LITERATURE_SYNTHESIS =
  "The delicate relationship between ambient environmental conditions and the physiological development of fungal crops is extensively documented in biological literature. Islam et al. (2022) state that continuously maintaining an optimal temperature range of 18°C to 24°C and a relative humidity between 80% and 95% is absolutely critical for healthy mycelial colonization and proper fruiting body formation. Girmay et al. (2016) demonstrate that even minor thermal variations significantly impact mycelial vigor, substrate-degrading enzyme activity, and the overall biological efficiency of the harvest. Hu et al. (2023) find through rigorous testing that strictly moderate temperatures around 20°C to 25°C are strictly required to prevent thermal stress and subsequent yield reduction in Pleurotus ostreatus. Chong et al. (2023) indicate that tight environmental control is exceptionally necessary for home-based and small-scale mushroom cultivation, validating that multi-sensor IoT frameworks directly improve crop yield and actively prevent the desiccation of developing basidiocarps.\n\n" +
  "Furthermore, inadequate air exchange and improper lighting pose severe morphological risks to the growing fungi. Bellettini et al. (2019) comprehensively review the cultivation parameters of Pleurotus species, establishing that while high carbon dioxide (CO₂) concentrations are tolerated during the vegetative spawn run, levels must be drastically reduced below 1,000 parts per million (ppm) during the fruiting phase to ensure proper morphogenesis. Mohammed et al. (2018) warn that the heavy accumulation of CO₂ emitted during active fungal respiration rapidly deforms the mushrooms, resulting in elongated stipes and rudimentary, unmarketable caps. Lin et al. (2022) reveal that poor indoor ventilation, specifically environments exceeding 2,000 ppm of CO₂, directly inhibits cap expansion and alters cellular morphology based on detailed comparative proteomic analyses of Pleurotus ostreatus.\n\n" +
  "In addition to air quality, specific light intensity serves as a critical environmental cue for fungal reproduction. Arjona et al. (2009) establish through controlled in vitro trials that reproducible photoperiods and regulated ambient light intensity are absolutely essential environmental triggers for initiating primordia differentiation. Bellettini et al. (2019) further specify that Pleurotus species require diffused light exposure ranging from 150 to 500 lux for 8 to 12 hours daily during the fruiting stage; total darkness completely prevents pinhead formation, while excessive illumination exceeding 1,000 lux can cause pileus discoloration and dehydration. KabuTech bridges this biological gap by creating an active, predictive regulation system that triggers corrective actuation—including ultrasonic humidification, exhaust ventilation to purge CO₂, misting, and automated artificial lighting arrays—before the indoor climate becomes hazardous to the crop.";

export const OYSTER_FRUITING: CropProfile = {
  id: 'oyster',
  name: 'Grey Oyster Mushroom',
  scientificName: 'Pleurotus ostreatus',
  stage: 'fruiting',
  temp: {
    min: 18,
    max: 25,
    criticalMargin: 3.0,
    unit: '°C',
    source: 'Islam et al. (2022); Hu et al. (2023); Girmay et al. (2016)',
    refs: ['Islam et al. (2022)', 'Hu et al. (2023)', 'Girmay et al. (2016)', 'Chong et al. (2023)'],
    description: 'Prevents heat stress and protects mycelial vigor.',
  },
  hum: {
    min: 80,
    max: 95,
    criticalMargin: 10,
    unit: '%',
    source: 'Islam et al. (2022); Chong et al. (2023)',
    refs: ['Islam et al. (2022)', 'Chong et al. (2023)'],
    description: 'Prevents cap desiccation and sustains pinheads.',
  },
  co2: {
    max: 1000,
    criticalMargin: 500,
    unit: 'ppm',
    source: 'Bellettini et al. (2019); Mohammed et al. (2018); Lin et al. (2022)',
    refs: ['Bellettini et al. (2019)', 'Mohammed et al. (2018)', 'Lin et al. (2022)'],
    description: 'Prevents elongated stipes and stunted caps.',
  },
  light: {
    min: 150,
    max: 1000,
    criticalMargin: 300,
    unit: 'lx',
    source: 'Bellettini et al. (2019); Arjona et al. (2009)',
    refs: ['Bellettini et al. (2019)', 'Arjona et al. (2009)'],
    description: 'Triggers primordia differentiation while avoiding discoloration.',
  },
  literatureSynthesis: LITERATURE_SYNTHESIS,
  allReferences: CROP_REFERENCES,
};

export const ACTIVE_PROFILE: CropProfile = OYSTER_FRUITING;
