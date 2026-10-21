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

  it('keeps values within the grace bearing buffer classified as in_range (Optimal)', () => {
    // Temp: 26.5°C is above 25°C but within the +2.0°C grace buffer (up to 27.0°C)
    const tempGrace = evaluateParam('temp', 26.5, false, ACTIVE_PROFILE);
    expect(tempGrace.state).toBe('in_range');
    expect(tempGrace.severity).toBe('ok');

    // Temp: 16.5°C is below 18°C but within the -2.0°C grace buffer (down to 16.0°C)
    const tempLowGrace = evaluateParam('temp', 16.5, false, ACTIVE_PROFILE);
    expect(tempLowGrace.state).toBe('in_range');
    expect(tempLowGrace.severity).toBe('ok');

    // Humidity: 78% is below 80% but within the -5.0% grace buffer (down to 75%)
    const humGrace = evaluateParam('hum', 78, false, ACTIVE_PROFILE);
    expect(humGrace.state).toBe('in_range');
    expect(humGrace.severity).toBe('ok');

    // CO2: 1100 ppm is above 1000 ppm but within the +150 ppm grace buffer (up to 1150 ppm)
    const co2Grace = evaluateParam('co2', 1100, false, ACTIVE_PROFILE);
    expect(co2Grace.state).toBe('in_range');
    expect(co2Grace.severity).toBe('ok');

    // Light: 120 lx is below 150 lx but within the -50 lx grace buffer (down to 100 lx)
    const lightGrace = evaluateParam('light', 120, false, ACTIVE_PROFILE);
    expect(lightGrace.state).toBe('in_range');
    expect(lightGrace.severity).toBe('ok');
  });

  it('identifies deviations that exceed the grace bearing as warnings', () => {
    // Temp: 27.5°C (> 25 + 2.0 grace, deviation is 2.5°C, criticalMargin is 3.0)
    const tempHigh = evaluateParam('temp', 27.5, false, ACTIVE_PROFILE);
    expect(tempHigh.state).toBe('high');
    expect(tempHigh.severity).toBe('warning');
    expect(tempHigh.deviation).toBe(2.5);

    // Humidity: 72% (< 80 - 5 grace, deviation is 8%, criticalMargin is 10)
    const humLow = evaluateParam('hum', 72, false, ACTIVE_PROFILE);
    expect(humLow.state).toBe('low');
    expect(humLow.severity).toBe('warning');
    expect(humLow.deviation).toBe(8);

    // CO2: 1250 ppm (> 1000 + 150 grace, deviation is 250 ppm, criticalMargin is 500)
    const co2High = evaluateParam('co2', 1250, false, ACTIVE_PROFILE);
    expect(co2High.state).toBe('high');
    expect(co2High.severity).toBe('warning');
    expect(co2High.deviation).toBe(250);
  });

  it('identifies severe deviations exceeding criticalMargin as critical', () => {
    // Temp: 29.0°C (> 25 + 3.0)
    const tempCrit = evaluateParam('temp', 29.0, false, ACTIVE_PROFILE);
    expect(tempCrit.state).toBe('high');
    expect(tempCrit.severity).toBe('critical');

    // Humidity: 65% (< 80 - 10)
    const humCrit = evaluateParam('hum', 65, false, ACTIVE_PROFILE);
    expect(humCrit.state).toBe('low');
    expect(humCrit.severity).toBe('critical');

    // CO2: 1600 ppm (> 1000 + 500)
    const co2Crit = evaluateParam('co2', 1600, false, ACTIVE_PROFILE);
    expect(co2Crit.state).toBe('high');
    expect(co2Crit.severity).toBe('critical');
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
  it('returns 4/4 and Optimal when all parameters are in crop range or within grace bearing', () => {
    // Temp 26.0 (grace), hum 78 (grace), co2 1050 (grace), light 500 (optimal)
    const chamber = evaluateChamber(
      { temp: 26.0, hum: 78, co2: 1050, light: 500 },
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

  it('accurately identifies parameters out of range (beyond grace) in summary text', () => {
    // Low humidity (72% < 75%) and high CO2 (1250 ppm > 1150 ppm)
    const chamber = evaluateChamber(
      { temp: 25.0, hum: 72, co2: 1250, light: 500 },
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
