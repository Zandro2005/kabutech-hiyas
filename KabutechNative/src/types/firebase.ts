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

export interface HarvestLogData {
  date: string;
  grams: number;
}

export interface BagData {
  id: number | string;
  status: 'Active' | 'Empty' | 'Contaminated';
  harvestLog?: HarvestLogData[] | Record<string, HarvestLogData>;
}

export interface BatchData {
  firebaseKey: string | number;
  id?: string | number;
  rack?: string;
  substrate?: string;
  archived?: boolean;
  setupDate?: string;
  bags?: BagData[] | Record<string, BagData>;
  historicalHarvests?: HarvestLogData[] | Record<string, HarvestLogData>;
}

export interface AlertData {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  dueDate?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'staff';
  approved: boolean;
  createdAt: string;
}
