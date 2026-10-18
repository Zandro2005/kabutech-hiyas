import {
  computeAutoDecision,
  computeAutoDevicesState,
  explainDeviceActivity,
} from '../src/utils/scheduleLogic';

describe('scheduleLogic - computeAutoDecision and hysteresis', () => {
  it('turns fans ON when temperature exceeds research max + grace (> 27.0°C) and stays ON until <= 25.0°C', () => {
    // 1. Initially OFF, temp at 26.5°C (within grace buffer) -> stays OFF
    const sensorsAtGrace = {
      temperature: 26.5,
      humidity: 85.0,
      light: 600,
      co2: 600,
      waterLevel: 80,
    };
    const decisionGrace = computeAutoDecision(sensorsAtGrace, { fans: false });
    expect(decisionGrace.states.fans).toBe(false);

    // 2. Temp spikes to 27.4°C (> 27.0°C) -> turns ON
    const sensorsHigh = {
      ...sensorsAtGrace,
      temperature: 27.4,
    };
    const decisionHigh = computeAutoDecision(sensorsHigh, { fans: false });
    expect(decisionHigh.states.fans).toBe(true);
    expect(decisionHigh.reasons.fans).toContain('Islam et al. (2022)');

    // 3. Hysteresis: Cooling down to 26.0°C (between 25.0°C and 27.0°C) while previously ON -> stays ON
    const sensorsCooling = {
      ...sensorsAtGrace,
      temperature: 26.0,
    };
    const decisionCooling = computeAutoDecision(sensorsCooling, { fans: true });
    expect(decisionCooling.states.fans).toBe(true);

    // 4. Cooled down to 24.8°C (<= 25.0°C) -> turns OFF
    const sensorsCooled = {
      ...sensorsAtGrace,
      temperature: 24.8,
    };
    const decisionCooled = computeAutoDecision(sensorsCooled, { fans: true });
    expect(decisionCooled.states.fans).toBe(false);
  });

  it('turns fans ON when CO2 exceeds research limit + grace (>= 1150 ppm) and stays ON until <= 900 ppm', () => {
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

    // Hysteresis: drops to 950 ppm while previously ON -> stays ON
    const decisionHysteresis = computeAutoDecision({ ...sensorsHighCO2, co2: 950 }, { fans: true });
    expect(decisionHysteresis.states.fans).toBe(true);

    // Drops to 850 ppm (<= 900 ppm) -> turns OFF
    const decisionCleared = computeAutoDecision({ ...sensorsHighCO2, co2: 850 }, { fans: true });
    expect(decisionCleared.states.fans).toBe(false);
  });

  it('turns misters ON when humidity drops below min - grace (< 75%) and stays ON until >= 88%', () => {
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

    // 3. Hysteresis: rises to 82% while previously ON -> stays ON
    const decisionRising = computeAutoDecision({ ...sensorsInGrace, humidity: 82.0 }, { misters: true });
    expect(decisionRising.states.misters).toBe(true);

    // 4. Rises to 89% (>= 88%) -> turns OFF
    const decisionTargetReached = computeAutoDecision({ ...sensorsInGrace, humidity: 89.0 }, { misters: true });
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

  it('turns lights ON when light drops below research min - grace (< 100 lx) and turns OFF at >= 300 lx', () => {
    // Light at 70 lx (< 100 lx) -> lights ON
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

    // Hysteresis: rises to 200 lx while previously ON -> stays ON
    const decisionRising = computeAutoDecision({ ...sensorsDark, light: 200 }, { lights: true });
    expect(decisionRising.states.lights).toBe(true);

    // Reaches 350 lx (>= 300 lx) -> turns OFF
    const decisionBright = computeAutoDecision({ ...sensorsDark, light: 350 }, { lights: true });
    expect(decisionBright.states.lights).toBe(false);
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
});
