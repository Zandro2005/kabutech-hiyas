import { getControlBands } from '../src/config/controlBands';
import { OYSTER_FRUITING } from '../src/config/cropProfiles';

describe('controlBands - getControlBands', () => {
  it('correctly derives thresholds with tropical grace bearing for Oyster Fruiting', () => {
    const bands = getControlBands(OYSTER_FRUITING);

    // Temperature: Max 25°C ON, 24.2°C OFF (hysteresis cooling)
    expect(bands.exhaustTempOn).toBe(25.0);
    expect(bands.exhaustTempOff).toBe(24.2);
    expect(bands.tempColdBelow).toBe(16.0); // 18°C - 2.0°C grace

    // Humidity: Min 80% - 5% grace = 75% ON, 75% OFF
    expect(bands.misterOn).toBe(75);
    expect(bands.misterOff).toBe(75);

    // High Humidity exhaust: 95% + 5% grace = 100% ON, 100% OFF
    expect(bands.exhaustHumOn).toBe(100);
    expect(bands.exhaustHumOff).toBe(100);

    // CO2: Max 1000 + 150 grace = 1150 ppm ON, 1150 ppm OFF
    expect(bands.exhaustCo2On).toBe(1150);
    expect(bands.exhaustCo2Off).toBe(1150);

    // Light: 150 lx ON (dark), 1000 lx OFF (scorching ceiling)
    expect(bands.lightsOn).toBe(150);
    expect(bands.lightsOff).toBe(1000);
  });

  it('guarantees valid deactivation thresholds aligned with optimal boundaries for all actuators', () => {
    const bands = getControlBands(OYSTER_FRUITING);

    expect(bands.exhaustTempOff).toBeLessThanOrEqual(bands.exhaustTempOn);
    expect(bands.misterOff).toBeGreaterThanOrEqual(bands.misterOn);
    expect(bands.exhaustCo2Off).toBeLessThanOrEqual(bands.exhaustCo2On);
    expect(bands.lightsOff).toBeGreaterThanOrEqual(bands.lightsOn);
  });
});
