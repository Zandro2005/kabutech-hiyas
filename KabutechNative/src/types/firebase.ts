export interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
  co2: number;
  esp32_status: 'online' | 'offline';
}

export interface DeviceStates {
  fans: boolean;
  misters: boolean;
  lights: boolean;
  co2: boolean;
}

export interface Setpoints {
  temperature: number;
  humidity: number;
  light: number;
  co2: number;
  mode: 'auto' | 'manual';
  devices: DeviceStates;
}

export interface SettingsData {
  setpoints: Setpoints;
  yieldTarget?: number;
}

export interface BatchData {
  firebaseKey: string | number;
  id?: string | number;
  rack?: string;
  substrate?: string;
  archived?: boolean;
  bags?: any;
  historicalHarvests?: any;
  [key: string]: any;
}

export interface AlertData {
  [key: string]: any;
}

export interface TaskData {
  [key: string]: any;
}
