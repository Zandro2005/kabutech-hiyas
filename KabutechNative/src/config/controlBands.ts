import { ACTIVE_PROFILE, CropProfile } from './cropProfiles';

/**
 * Control thresholds with hysteresis and grace bearing.
 * Derived dynamically from the literature crop profile.
 */
export interface ControlBands {
  exhaustTempOn: number;  // Temp above which exhaust fan turns ON (25.0 °C)
  exhaustTempOff: number; // Temp below which exhaust fan turns OFF (24.2 °C)
  misterTempOn: number;   // Temp above which misters turn ON for evaporative cooling (25.0 °C)
  misterTempOff: number;  // Temp below which misters turn OFF (24.2 °C)
  exhaustCo2On: number;   // CO2 above which exhaust fan turns ON (1150 ppm)
  exhaustCo2Off: number;  // CO2 below which exhaust fan turns OFF (1150 ppm)
  exhaustHumOn: number;   // Hum above which exhaust fan turns ON (100 %)
  exhaustHumOff: number;  // Hum below which exhaust fan turns OFF (100 %)
  misterOn: number;       // Hum below which misters turn ON (75 %)
  misterOff: number;      // Hum above which misters turn OFF (75 %)
  lightsOn: number;       // Light below which grow lights turn ON (150 lx)
  lightsOff: number;      // Light above which grow lights turn OFF (1000 lx)
  tempColdBelow: number;  // Temp below which fans are locked OFF to retain heat (16.0 °C)
}

export const getControlBands = (p: CropProfile = ACTIVE_PROFILE): ControlBands => {
  const tempMax = p.temp.max ?? 25;
  const tempMin = p.temp.min ?? 18;
  const tempGrace = p.temp.graceBearing ?? 2.0;

  const humMax = p.hum.max ?? 95;
  const humMin = p.hum.min ?? 80;
  const humGrace = p.hum.graceBearing ?? 5.0;

  const co2Max = p.co2.max ?? 1000;
  const co2Grace = p.co2.graceBearing ?? 150;

  const lightMin = p.light.min ?? 150;
  const lightGrace = p.light.graceBearing ?? 50;
  const lightMax = p.light.max ?? 500;

  return {
    exhaustTempOn: tempMax,                    // 25.0 °C (ON when exceeding 25°C optimal ceiling)
    exhaustTempOff: tempMax - 0.8,             // 24.2 °C (OFF once safely cooled into optimal band)
    misterTempOn: tempMax,                     // 25.0 °C (ON for evaporative cooling when hot)
    misterTempOff: tempMax - 0.8,              // 24.2 °C (OFF once safely cooled into optimal band)
    exhaustCo2On: co2Max + co2Grace,           // 1150 ppm (ON beyond grace)
    exhaustCo2Off: co2Max,                     // 1000 ppm (OFF once purged back to optimal <= 1000 ppm)
    exhaustHumOn: humMax + humGrace,           // 100 % (ON only if 100% saturated)
    exhaustHumOff: humMax - 1,                 // 94 % (OFF once dehumidified into optimal <= 94 %)
    misterOn: humMin - humGrace,               // 75 % (ON when dry)
    misterOff: humMin + 2,                     // 82 % (OFF once misted back into optimal >= 82 %)
    lightsOn: 150,                             // 150 lx (ON when dark / below optimal fruiting threshold)
    lightsOff: 1000,                           // 1000 lx (OFF when exceeding 1000 lx optimal ceiling / too bright)
    tempColdBelow: tempMin - tempGrace,        // 16.0 °C
  };
};
