import {
  computeAutoDecision,
  computeAutoDevicesState,
  explainDeviceActivity,
  normalizeAppMode,
  getDisplayModeLabel,
} from '../src/utils/scheduleLogic';

describe('scheduleLogic - computeAutoDecision and hysteresis', () => {
  it('turns fans ON when temperature exceeds research ceiling (> 25.0°C) and turns OFF at <= 24.2°C', () => {
    // 1. Initially OFF, temp at 24.5°C (within optimal 18-25°C band) -> stays OFF
    const sensorsOptimal = {
      temperature: 24.5,
      humidity: 85.0,
      light: 600,
      co2: 600,
      waterLevel: 80,
    };
    const decisionOptimal = computeAutoDecision(sensorsOptimal, { fans: false });
    expect(decisionOptimal.states.fans).toBe(false);

    // 2. Temp spikes to 25.4°C (> 25.0°C) -> turns ON
    const sensorsHigh = {
      ...sensorsOptimal,
      temperature: 25.4,
    };
    const decisionHigh = computeAutoDecision(sensorsHigh, { fans: false });
    expect(decisionHigh.states.fans).toBe(true);
    expect(decisionHigh.reasons.fans).toContain('Islam et al. (2022)');

    // 3. Cooled down to 24.0°C (<= 24.2°C, returned to optimal zone) -> turns OFF
    const sensorsCooled = {
      ...sensorsOptimal,
      temperature: 24.0,
    };
    const decisionCooled = computeAutoDecision(sensorsCooled, { fans: true, fansTemp: true });
    expect(decisionCooled.states.fans).toBe(false);
  });

  it('turns fans ON when CO2 exceeds research limit + grace (>= 1150 ppm) and turns OFF at <= 1150 ppm', () => {
    // CO2 at 1200 ppm (>= 1150 ppm) -> fans ON
    const sensorsHighCO2 = {
      temperature: 24.0,
      humidity: 85.0,
      light: 600,
      co2: 1200,
      waterLevel: 80,
    };
    const decision = computeAutoDecision(sensorsHighCO2, { fans: false });
    expect(decision.states.fans).toBe(true);
    expect(decision.reasons.fans).toContain('Bellettini et al. (2019)');

    // Drops to 1100 ppm (<= 1150 ppm, returned to optimal zone) -> turns OFF
    const decisionCleared = computeAutoDecision({ ...sensorsHighCO2, co2: 1100 }, { fans: true, fansCo2: true });
    expect(decisionCleared.states.fans).toBe(false);
  });

  it('prevents cross-trigger latching: CO2 spike turns fans ON, clearing CO2 turns fans OFF even with safe ambient temp at 24.0°C', () => {
    const ambientSensors = {
      temperature: 24.0, // Normal tropical ambient within optimal 18-25°C band
      humidity: 85.0,
      light: 600,
      co2: 1250,        // CO2 spike!
      waterLevel: 80,
    };

    // 1. Spiked CO2 turns fans ON
    const spikedDecision = computeAutoDecision(ambientSensors, { fans: false });
    expect(spikedDecision.states.fans).toBe(true);
    expect(spikedDecision.states.fansCo2).toBe(true);
    expect(spikedDecision.states.fansTemp).toBe(false);

    // 2. CO2 purges down to 950 ppm (optimal target). Ambient temp remains 24.0°C.
    // Fans must turn OFF because Temp was never the trigger that turned fans ON!
    const normalizedDecision = computeAutoDecision(
      { ...ambientSensors, co2: 950 },
      spikedDecision.states
    );
    expect(normalizedDecision.states.fans).toBe(false);
    expect(normalizedDecision.states.fansCo2).toBe(false);
  });

  it('turns misters ON when humidity drops below min - grace (< 75%) and turns OFF when optimal (>= 75%)', () => {
    // 1. Humidity at 78% (within 75-80% grace buffer) -> stays OFF
    const sensorsInGrace = {
      temperature: 24.0,
      humidity: 78.0,
      light: 600,
      co2: 600,
      waterLevel: 80,
    };
    const decisionGrace = computeAutoDecision(sensorsInGrace, { misters: false });
    expect(decisionGrace.states.misters).toBe(false);

    // 2. Humidity drops to 72% (< 75%) and water safe -> misters turn ON
    const sensorsLow = { ...sensorsInGrace, humidity: 72.0 };
    const decisionLow = computeAutoDecision(sensorsLow, { misters: false });
    expect(decisionLow.states.misters).toBe(true);
    expect(decisionLow.reasons.misters).toContain('Islam et al. (2022)');

    // 3. Rises back to 76% (>= 75%, optimal) -> turns OFF
    const decisionTargetReached = computeAutoDecision({ ...sensorsInGrace, humidity: 76.0 }, { misters: true });
    expect(decisionTargetReached.states.misters).toBe(false);
  });

  it('blocks misters and raises mistersBlocked reason when water level is <= 15%', () => {
    const sensors = {
      temperature: 24.0,
      humidity: 70.0,
      light: 600,
      co2: 600,
      waterLevel: 10, // Dangerous low water!
    };

    const decision = computeAutoDecision(sensors, { misters: false });
    expect(decision.states.misters).toBe(false);
    expect(decision.reasons.mistersBlocked).toContain('misting paused to protect pump');
  });

  it('turns lights ON when dark (< 150 lx), maintains ON in optimal band (150 - 1000 lx), and turns OFF when too bright (>= 1000 lx)', () => {
    // 1. Light at 70 lx (< 150 lx) -> lights ON
    const sensorsDark = {
      temperature: 24.0,
      humidity: 85.0,
      light: 70,
      co2: 600,
      waterLevel: 50,
    };

    const decision = computeAutoDecision(sensorsDark, { lights: false });
    expect(decision.states.lights).toBe(true);
    expect(decision.reasons.lights).toContain('Bellettini et al. (2019)');

    // 2. Chamber is illuminated into optimal fruiting range (300 lx, 600 lx) -> MAINTAINS lights ON
    const decisionOptimal = computeAutoDecision({ ...sensorsDark, light: 300 }, { lights: true });
    expect(decisionOptimal.states.lights).toBe(true);

    const decisionMidOptimal = computeAutoDecision({ ...sensorsDark, light: 600 }, { lights: true });
    expect(decisionMidOptimal.states.lights).toBe(true);

    // 3. Exceeds scorching ceiling (>= 1000 lx) -> turns OFF
    const decisionTooBright = computeAutoDecision({ ...sensorsDark, light: 1050 }, { lights: true });
    expect(decisionTooBright.states.lights).toBe(false);

    // 4. In bright room/daylight (400 lx) when lights were OFF -> remains OFF
    const decisionDaylight = computeAutoDecision({ ...sensorsDark, light: 400 }, { lights: false });
    expect(decisionDaylight.states.lights).toBe(false);
  });

  it('locks exhaust fans OFF when temperature is below safe biological floor (< 16.0°C)', () => {
    // Cold room (15.0°C) with elevated CO2 (1300 ppm) -> fans must NOT run to prevent crop chilling
    const sensorsCold = {
      temperature: 15.0,
      humidity: 85.0,
      light: 600,
      co2: 1300,
      waterLevel: 80,
    };

    const decision = computeAutoDecision(sensorsCold, { fans: false });
    expect(decision.states.fans).toBe(false);
    expect(decision.reasons.fans).toContain('fans locked OFF to retain heat');
  });

  it('returns clean device states from computeAutoDevicesState', () => {
    const sensors = {
      temperature: 28.0, // > 27.0 -> fans ON
      humidity: 70.0,    // < 75 -> misters ON
      light: 500,        // lights OFF
      co2: 600,
      waterLevel: 80,
    };

    const states = computeAutoDevicesState(sensors, { fans: false, misters: false });
    expect(states).toEqual({
      fans: true,
      fanIn: true,
      fanOut: true,
      misters: true,
      lights: false,
      valve: false,
      co2: false,
    });
  });

  it('generates structured explainDeviceActivity explanations in Auto, Scheduled, and Manual modes', () => {
    // 1. Auto mode with active misting
    const autoExplanations = explainDeviceActivity(
      'auto',
      { fans: false, misters: true, lights: false, co2: false },
      { temperature: 24, humidity: 72, light: 600, co2: 600, waterLevel: 75 }
    );
    expect(autoExplanations.some(e => e.label === 'Mister' && e.isActive)).toBe(true);

    // 2. Auto mode idle
    const idleExplanations = explainDeviceActivity(
      'auto',
      { fans: false, misters: false, lights: false, co2: false },
      { temperature: 24, humidity: 85, light: 500, co2: 650, waterLevel: 75 }
    );
    expect(idleExplanations[0].reason).toContain('All devices idle');

    // 3. Manual mode
    const manualExplanations = explainDeviceActivity(
      'manual',
      { fans: true, misters: true, lights: false, co2: false }
    );
    expect(manualExplanations[0].reason).toContain('Fans, Mister switched on manually by operator');
  });

  it('normalizes modes and produces unified App/TFT display labels', () => {
    expect(normalizeAppMode('auto')).toBe('auto');
    expect(normalizeAppMode('AUTO')).toBe('auto');
    expect(normalizeAppMode('scheduled')).toBe('scheduled');
    expect(normalizeAppMode('TIMED')).toBe('scheduled');
    expect(normalizeAppMode('manual')).toBe('manual');
    expect(normalizeAppMode('MANUAL')).toBe('manual');
    expect(normalizeAppMode(null)).toBe('auto');

    expect(getDisplayModeLabel('auto', false)).toBe('AI AUTO');
    expect(getDisplayModeLabel('scheduled', false)).toBe('TIMED');
    expect(getDisplayModeLabel('timed', false)).toBe('TIMED');
    expect(getDisplayModeLabel('manual', false)).toBe('MANUAL');
    expect(getDisplayModeLabel('manual', true)).toBe('AI AUTO (LOCAL)');
  });
});
