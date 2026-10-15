import {
  computeAutoDecision,
  computeAutoDevicesState,
  explainDeviceActivity,
} from '../src/utils/scheduleLogic';

describe('scheduleLogic - computeAutoDecision and explainDeviceActivity', () => {
  const setpoints = {
    temperature: 28.0,
    humidity: 85.0,
    light: 580,
    co2: 690,
  };

  it('turns fans ON when CO2 exceeds target + 25 ppm and provides explicit reason', () => {
    const sensors = {
      temperature: 26.0,
      humidity: 85.0,
      light: 600,
      co2: 750, // > 690 + 25
      waterLevel: 80,
    };

    const decision = computeAutoDecision(sensors, setpoints);
    expect(decision.states.fans).toBe(true);
    expect(decision.reasons.fans).toContain('CO₂ 750 ppm is above target 690 ppm');
  });

  it('turns misters ON when humidity drops below target - 2.0% and water is safe', () => {
    const sensors = {
      temperature: 26.0,
      humidity: 80.0, // < 85 - 2.0
      light: 600,
      co2: 600,
      waterLevel: 50, // > 15% safe
    };

    const decision = computeAutoDecision(sensors, setpoints);
    expect(decision.states.misters).toBe(true);
    expect(decision.reasons.misters).toContain('Humidity 80% is below target 85%');
  });

  it('blocks misters and raises mistersBlocked reason when water level is <= 15%', () => {
    const sensors = {
      temperature: 26.0,
      humidity: 80.0,
      light: 600,
      co2: 600,
      waterLevel: 10, // Dangerous low water!
    };

    const decision = computeAutoDecision(sensors, setpoints);
    expect(decision.states.misters).toBe(false); // Safeguard prevents pump burn
    expect(decision.reasons.mistersBlocked).toContain('misting paused to protect pump');
  });

  it('turns lights ON when light drops below target - 50 lx', () => {
    const sensors = {
      temperature: 26.0,
      humidity: 85.0,
      light: 400, // < 580 - 50
      co2: 600,
      waterLevel: 50,
    };

    const decision = computeAutoDecision(sensors, setpoints);
    expect(decision.states.lights).toBe(true);
    expect(decision.reasons.lights).toContain('Light 400 lx is below target 580 lx');
  });

  it('keeps computeAutoDevicesState backwards-compatible with raw states', () => {
    const sensors = {
      temperature: 30.0, // > 28.5 -> fans ON
      humidity: 80.0,    // < 83.0 -> misters ON
      light: 700,        // lights OFF
      co2: 600,
      waterLevel: 80,
    };

    const states = computeAutoDevicesState(sensors, setpoints);
    expect(states).toEqual({
      fans: true,
      misters: true,
      lights: false,
      co2: false,
    });
  });

  it('generates clear explainDeviceActivity explanations in Auto, Scheduled, and Manual modes', () => {
    // 1. Auto mode with active misting
    const autoExplanations = explainDeviceActivity(
      'auto',
      { fans: false, misters: true, lights: false, co2: false },
      { temperature: 26, humidity: 80, light: 600, co2: 600, waterLevel: 75 },
      setpoints
    );
    expect(autoExplanations.some(e => e.label === 'Mister' && e.isActive)).toBe(true);

    // 2. Auto mode idle
    const idleExplanations = explainDeviceActivity(
      'auto',
      { fans: false, misters: false, lights: false, co2: false },
      { temperature: 28, humidity: 85, light: 580, co2: 650, waterLevel: 75 },
      setpoints
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
