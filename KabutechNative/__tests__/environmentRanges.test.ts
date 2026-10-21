import { evaluateParam, evaluateChamber } from '../src/utils/environmentRanges';
import { ACTIVE_PROFILE } from '../src/config/cropProfiles';

describe('environmentRanges - evaluateParam', () => {
  it('correctly classifies values inside the crop profile range', () => {
    // Temp: 18–25°C
    const tempEval = evaluateParam('temp', 22.5, false, ACTIVE_PROFILE);
    expect(tempEval.state).toBe('in_range');
    expect(tempEval.severity).toBe('ok');
    expect(tempEval.deviation).toBe(0);

    // Humidity: 80–95%
    const humEval = evaluateParam('hum', 88, false, ACTIVE_PROFILE);
    expect(humEval.state).toBe('in_range');
    expect(humEval.severity).toBe('ok');

    // CO2: <= 1000 ppm
    const co2Eval = evaluateParam('co2', 650, false, ACTIVE_PROFILE);
    expect(co2Eval.state).toBe('in_range');
    expect(co2Eval.severity).toBe('ok');

    // Light: 150–1000 lx
    const lightEval = evaluateParam('light', 500, false, ACTIVE_PROFILE);
    expect(lightEval.state).toBe('in_range');
    expect(lightEval.severity).toBe('ok');
  });

  it('correctly handles exact boundary values (inclusive)', () => {
    expect(evaluateParam('temp', 18, false, ACTIVE_PROFILE).state).toBe('in_range');
    expect(evaluateParam('temp', 25, false, ACTIVE_PROFILE).state).toBe('in_range');
    expect(evaluateParam('hum', 80, false, ACTIVE_PROFILE).state).toBe('in_range');
    expect(evaluateParam('hum', 95, false, ACTIVE_PROFILE).state).toBe('in_range');
    expect(evaluateParam('co2', 1000, false, ACTIVE_PROFILE).state).toBe('in_range');
    expect(evaluateParam('light', 150, false, ACTIVE_PROFILE).state).toBe('in_range');
  });

  it('identifies values outside [min, max] as low or high with exact TFT status labels', () => {
    // Temp: 26.5°C is above 25°C -> High warning (deviation 1.5°C)
    const tempHigh = evaluateParam('temp', 26.5, false, ACTIVE_PROFILE);
    expect(tempHigh.state).toBe('high');
    expect(tempHigh.severity).toBe('warning');
    expect(tempHigh.statusLabel).toBe('High');

    // Temp: 16.5°C is below 18°C -> Low warning (deviation 1.5°C)
    const tempLow = evaluateParam('temp', 16.5, false, ACTIVE_PROFILE);
    expect(tempLow.state).toBe('low');
    expect(tempLow.severity).toBe('warning');
    expect(tempLow.statusLabel).toBe('Low');

    // Humidity: 78% is below 80% -> Low warning (deviation 2%)
    const humLow = evaluateParam('hum', 78, false, ACTIVE_PROFILE);
    expect(humLow.state).toBe('low');
    expect(humLow.severity).toBe('warning');
    expect(humLow.statusLabel).toBe('Low');

    // Humidity: 98% is above 95% -> Sat (Amber)
    const humSat = evaluateParam('hum', 98, false, ACTIVE_PROFILE);
    expect(humSat.state).toBe('high');
    expect(humSat.severity).toBe('warning');
    expect(humSat.statusLabel).toBe('Sat');

    // CO2: 1100 ppm is above 1000 ppm -> High warning (deviation 100 ppm)
    const co2High = evaluateParam('co2', 1100, false, ACTIVE_PROFILE);
    expect(co2High.state).toBe('high');
    expect(co2High.severity).toBe('warning');
    expect(co2High.statusLabel).toBe('High');

    // Light: 120 lx is below 150 lx -> Low warning
    const lightLow = evaluateParam('light', 120, false, ACTIVE_PROFILE);
    expect(lightLow.state).toBe('low');
    expect(lightLow.severity).toBe('warning');
    expect(lightLow.statusLabel).toBe('Low');

    // Light: 100 lx is exactly in Low band (100–149 lx)
    const light100 = evaluateParam('light', 100, false, ACTIVE_PROFILE);
    expect(light100.state).toBe('low');
    expect(light100.severity).toBe('warning');
    expect(light100.statusLabel).toBe('Low');
  });

  it('identifies severe deviations exceeding criticalMargin as critical (Dark, Dry, Crit)', () => {
    // Temp: 29.0°C (> 25 + 2.0 criticalMargin)
    const tempCrit = evaluateParam('temp', 29.0, false, ACTIVE_PROFILE);
    expect(tempCrit.state).toBe('high');
    expect(tempCrit.severity).toBe('critical');
    expect(tempCrit.statusLabel).toBe('Crit');

    // Humidity: 72% (< 80 - 5.0 criticalMargin) -> Dry
    const humCrit = evaluateParam('hum', 72, false, ACTIVE_PROFILE);
    expect(humCrit.state).toBe('low');
    expect(humCrit.severity).toBe('critical');
    expect(humCrit.statusLabel).toBe('Dry');

    // CO2: 1600 ppm (> 1000 + 500 criticalMargin) -> Crit
    const co2Crit = evaluateParam('co2', 1600, false, ACTIVE_PROFILE);
    expect(co2Crit.state).toBe('high');
    expect(co2Crit.severity).toBe('critical');
    expect(co2Crit.statusLabel).toBe('Crit');

    // Light: 80 lx (< 100 lx) -> Dark
    const lightCrit = evaluateParam('light', 80, false, ACTIVE_PROFILE);
    expect(lightCrit.state).toBe('low');
    expect(lightCrit.severity).toBe('critical');
    expect(lightCrit.statusLabel).toBe('Dark');
  });

  it('handles sensor faults, -999, null, and offline status gracefully', () => {
    const fault1 = evaluateParam('temp', -999, false, ACTIVE_PROFILE);
    expect(fault1.state).toBe('fault');
    expect(fault1.severity).toBe('fault');
    expect(fault1.formattedValue).toBe('--');

    const fault2 = evaluateParam('hum', null, false, ACTIVE_PROFILE);
    expect(fault2.state).toBe('fault');

    const fault3 = evaluateParam('co2', 600, true, ACTIVE_PROFILE);
    expect(fault3.state).toBe('fault');
  });
});

describe('environmentRanges - evaluateChamber', () => {
  it('returns 4/4 and Optimal when all parameters are in crop range', () => {
    // Temp 22.0, hum 88, co2 600, light 500 (all optimal)
    const chamber = evaluateChamber(
      { temp: 22.0, hum: 88, co2: 600, light: 500 },
      { temp: false, hum: false, co2: false, light: false, isControllerOffline: false },
      ACTIVE_PROFILE
    );

    expect(chamber.inRangeCount).toBe(4);
    expect(chamber.total).toBe(4);
    expect(chamber.faultCount).toBe(0);
    expect(chamber.allInRange).toBe(true);
    expect(chamber.statusLabel).toBe('Optimal');
    expect(chamber.summary).toBe('All 4 parameters within crop range');
  });

  it('accurately identifies parameters out of range in summary text', () => {
    // Low humidity (72%) and high CO2 (1250 ppm)
    const chamber = evaluateChamber(
      { temp: 22.0, hum: 72, co2: 1250, light: 500 },
      {},
      ACTIVE_PROFILE
    );

    expect(chamber.inRangeCount).toBe(2);
    expect(chamber.allInRange).toBe(false);
    expect(chamber.summary).toContain('Humidity low');
    expect(chamber.summary).toContain('CO2 high');
  });

  it('keeps denominator at 4 and indicates sensor faults', () => {
    const chamber = evaluateChamber(
      { temp: 25.0, hum: 90, co2: 700, light: -999 },
      { light: true },
      ACTIVE_PROFILE
    );

    expect(chamber.total).toBe(4);
    expect(chamber.inRangeCount).toBe(3);
    expect(chamber.faultCount).toBe(1);
    expect(chamber.summary).toContain('Light fault');
  });

  it('reports Controller offline when controller is disconnected', () => {
    const chamber = evaluateChamber(
      { temp: 25.0, hum: 90, co2: 700, light: 500 },
      { isControllerOffline: true },
      ACTIVE_PROFILE
    );

    expect(chamber.inRangeCount).toBe(0);
    expect(chamber.faultCount).toBe(4);
    expect(chamber.statusLabel).toBe('Offline');
    expect(chamber.summary).toContain('Controller offline');
  });
});
