import { getControlBands } from '../src/config/controlBands';
import { OYSTER_FRUITING } from '../src/config/cropProfiles';

describe('controlBands - getControlBands', () => {
  it('correctly derives thresholds with tropical grace bearing for Oyster Fruiting', () => {
    const bands = getControlBands(OYSTER_FRUITING);

    // Temperature: Max 25°C + 2.0°C grace = 27.0°C ON, 25.0°C OFF
    expect(bands.exhaustTempOn).toBe(27.0);
    expect(bands.exhaustTempOff).toBe(25.0);
    expect(bands.tempColdBelow).toBe(16.0); // 18°C - 2.0°C grace

    // Humidity: Min 80% - 5% grace = 75% ON, 80 + 8 = 88% OFF
    expect(bands.misterOn).toBe(75);
    expect(bands.misterOff).toBe(88);

    // High Humidity exhaust: 95% + 5% grace = 100% ON, 92% OFF
    expect(bands.exhaustHumOn).toBe(100);
    expect(bands.exhaustHumOff).toBe(92);

    // CO2: Max 1000 + 150 grace = 1150 ppm ON, 900 ppm OFF
    expect(bands.exhaustCo2On).toBe(1150);
    expect(bands.exhaustCo2Off).toBe(900);

    // Light: Min 150 - 50 grace = 100 lx ON, 300 lx OFF
    expect(bands.lightsOn).toBe(100);
    expect(bands.lightsOff).toBe(300);
  });

  it('guarantees valid hysteresis deadband gaps for all actuators', () => {
    const bands = getControlBands(OYSTER_FRUITING);

    // Exhaust temp hysteresis: turns off lower than it turns on
    expect(bands.exhaustTempOff).toBeLessThan(bands.exhaustTempOn);

    // Mister humidity hysteresis: turns off higher than it turns on
    expect(bands.misterOff).toBeGreaterThan(bands.misterOn);

    // Exhaust CO2 hysteresis: turns off lower than it turns on
    expect(bands.exhaustCo2Off).toBeLessThan(bands.exhaustCo2On);

    // Lights hysteresis: turns off higher than it turns on
    expect(bands.lightsOff).toBeGreaterThan(bands.lightsOn);
  });
});
