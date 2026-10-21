import { CropProfile, ACTIVE_PROFILE, ParamRange } from '../config/cropProfiles';

export type ParamKey = 'temp' | 'hum' | 'co2' | 'light';
export type ParamState = 'in_range' | 'low' | 'high' | 'fault';
export type ParamSeverity = 'ok' | 'warning' | 'critical' | 'fault';

export interface ParamEvaluation {
  key: ParamKey;
  label: string;
  state: ParamState;
  severity: ParamSeverity;
  statusLabel: string; // TFT-aligned: "Optimal" | "Low" | "High" | "Dark" | "Dry" | "Sat" | "Crit" | "Fault"
  value: number | null;
  formattedValue: string;
  unit: string;
  rangeText: string;
  min?: number;
  max?: number;
  deviation: number;
  source: string;
  refs: string[];
  description?: string;
}

export interface ChamberEvaluation {
  params: Record<ParamKey, ParamEvaluation>;
  inRangeCount: number;
  total: 4;
  faultCount: number;
  allInRange: boolean;
  summary: string;
  statusLabel: string;
  badgeColor: string;
  profile: CropProfile;
}

const PARAM_LABELS: Record<ParamKey, string> = {
  temp: 'Temperature',
  hum: 'Humidity',
  co2: 'CO2 Level',
  light: 'Light Level',
};

export function formatRangeText(range: ParamRange): string {
  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min} - ${range.max} ${range.unit}`;
  }
  if (range.max !== undefined) {
    return `< ${range.max} ${range.unit}`;
  }
  if (range.min !== undefined) {
    return `> ${range.min} ${range.unit}`;
  }
  return '';
}

export function evaluateParam(
  key: ParamKey,
  value: number | null | undefined,
  isFault: boolean = false,
  profile: CropProfile = ACTIVE_PROFILE
): ParamEvaluation {
  const range = profile[key];
  const label = PARAM_LABELS[key];
  const unit = range.unit;
  const rangeText = formatRangeText(range);

  const isValidValue =
    !isFault &&
    typeof value === 'number' &&
    !isNaN(value) &&
    value !== -999 &&
    (key === 'light' ? value >= 0 : value > 0);

  if (!isValidValue || value == null) {
    return {
      key,
      label,
      state: 'fault',
      severity: 'fault',
      statusLabel: 'Fault',
      value: null,
      formattedValue: '--',
      unit,
      rangeText,
      min: range.min,
      max: range.max,
      deviation: 0,
      source: range.source,
      refs: range.refs || [],
      description: range.description,
    };
  }

  // Format value string
  const formattedValue =
    key === 'temp'
      ? value.toFixed(1)
      : key === 'hum'
        ? Math.round(value).toString()
        : Math.round(value).toString();

  // Determine specific TFT-matching status label: "Dark", "Dry", "Sat", "Low", "High", "Crit", "Optimal"
  let statusLabel = 'Optimal';
  let state: ParamState = 'in_range';
  let severity: ParamSeverity = 'ok';
  let deviation = 0;

  if (key === 'temp') {
    if (value < 18.0) {
      state = 'low';
      deviation = Number((18.0 - value).toFixed(1));
      if (value < 16.0) {
        severity = 'critical';
        statusLabel = 'Crit';
      } else {
        severity = 'warning';
        statusLabel = 'Low';
      }
    } else if (value > 25.0) {
      state = 'high';
      deviation = Number((value - 25.0).toFixed(1));
      if (value > 27.0) {
        severity = 'critical';
        statusLabel = 'Crit';
      } else {
        severity = 'warning';
        statusLabel = 'High';
      }
    } else {
      state = 'in_range';
      severity = 'ok';
      statusLabel = 'Optimal';
    }
  } else if (key === 'hum') {
    if (value < 80.0) {
      state = 'low';
      deviation = Number((80.0 - value).toFixed(1));
      if (value < 75.0) {
        severity = 'critical';
        statusLabel = 'Dry';
      } else {
        severity = 'warning';
        statusLabel = 'Low';
      }
    } else if (value > 95.0) {
      state = 'high';
      deviation = Number((value - 95.0).toFixed(1));
      severity = 'warning';
      statusLabel = 'Sat';
    } else {
      state = 'in_range';
      severity = 'ok';
      statusLabel = 'Optimal';
    }
  } else if (key === 'co2') {
    if (value > 1000) {
      state = 'high';
      deviation = Number((value - 1000).toFixed(1));
      if (value > 1500) {
        severity = 'critical';
        statusLabel = 'Crit';
      } else {
        severity = 'warning';
        statusLabel = 'High';
      }
    } else {
      state = 'in_range';
      severity = 'ok';
      statusLabel = 'Optimal';
    }
  } else if (key === 'light') {
    if (value < 150) {
      state = 'low';
      deviation = Number((150 - value).toFixed(1));
      if (value < 100) {
        severity = 'critical';
        statusLabel = 'Dark';
      } else {
        severity = 'warning';
        statusLabel = 'Low';
      }
    } else if (value > 1000) {
      state = 'high';
      deviation = Number((value - 1000).toFixed(1));
      severity = 'warning';
      statusLabel = 'High';
    } else {
      state = 'in_range';
      severity = 'ok';
      statusLabel = 'Optimal';
    }
  }

  return {
    key,
    label,
    state,
    severity,
    statusLabel,
    value,
    formattedValue,
    unit,
    rangeText,
    min: range.min,
    max: range.max,
    deviation,
    source: range.source,
    refs: range.refs || [],
    description: range.description,
  };
}

export function evaluateChamber(
  readings: {
    temp?: number | null;
    hum?: number | null;
    co2?: number | null;
    light?: number | null;
  },
  faults: {
    temp?: boolean;
    hum?: boolean;
    co2?: boolean;
    light?: boolean;
    isControllerOffline?: boolean;
  } = {},
  profile: CropProfile = ACTIVE_PROFILE
): ChamberEvaluation {
  const isOffline = Boolean(faults.isControllerOffline);

  const tempEval = evaluateParam('temp', readings.temp, isOffline || Boolean(faults.temp), profile);
  const humEval = evaluateParam('hum', readings.hum, isOffline || Boolean(faults.hum), profile);
  const co2Eval = evaluateParam('co2', readings.co2, isOffline || Boolean(faults.co2), profile);
  const lightEval = evaluateParam('light', readings.light, isOffline || Boolean(faults.light), profile);

  const params: Record<ParamKey, ParamEvaluation> = {
    temp: tempEval,
    hum: humEval,
    co2: co2Eval,
    light: lightEval,
  };

  const evalList = [tempEval, humEval, co2Eval, lightEval];
  const faultCount = evalList.filter(p => p.state === 'fault').length;
  const inRangeCount = evalList.filter(p => p.state === 'in_range').length;
  const hasCritical = evalList.some(p => p.severity === 'critical');
  const allInRange = inRangeCount === 4;

  // Generate clear, factual human-readable summary
  let summary = '';
  if (isOffline) {
    summary = 'Controller offline - Check connection';
  } else if (faultCount > 0 && inRangeCount === 0) {
    summary = `${faultCount} sensor fault${faultCount > 1 ? 's' : ''}`;
  } else if (allInRange) {
    summary = 'All 4 parameters within crop range';
  } else {
    const issues: string[] = [];
    if (tempEval.state === 'low') issues.push('Temp low');
    else if (tempEval.state === 'high') issues.push('Temp high');
    else if (tempEval.state === 'fault') issues.push('Temp fault');

    if (humEval.state === 'low') issues.push('Humidity low');
    else if (humEval.state === 'high') issues.push('Humidity high');
    else if (humEval.state === 'fault') issues.push('Hum fault');

    if (co2Eval.state === 'high') issues.push('CO2 high');
    else if (co2Eval.state === 'fault') issues.push('CO2 fault');

    if (lightEval.state === 'low') issues.push('Light low');
    else if (lightEval.state === 'high') issues.push('Light high');
    else if (lightEval.state === 'fault') issues.push('Light fault');

    summary = issues.join(' - ');
  }

  // Status label & badge color
  let statusLabel = 'Optimal';
  let badgeColor = '#10b981'; // Emerald

  if (isOffline) {
    statusLabel = 'Offline';
    badgeColor = '#94a3b8'; // Slate
  } else if (faultCount === 4) {
    statusLabel = 'Offline';
    badgeColor = '#94a3b8';
  } else if (allInRange) {
    statusLabel = 'Optimal';
    badgeColor = '#10b981';
  } else if (hasCritical) {
    statusLabel = 'Critical Drift';
    badgeColor = '#ef4444'; // Red
  } else if (inRangeCount >= 2) {
    statusLabel = 'Moderate Drift';
    badgeColor = '#f59e0b'; // Amber
  } else {
    statusLabel = 'Attention Required';
    badgeColor = '#ea580c'; // Orange
  }

  return {
    params,
    inRangeCount,
    total: 4,
    faultCount,
    allInRange,
    summary,
    statusLabel,
    badgeColor,
    profile,
  };
}
