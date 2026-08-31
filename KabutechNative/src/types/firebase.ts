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
  mode: 'auto' | 'manual' | 'scheduled';
  devices: DeviceStates;
  aiOverride?: boolean;
}

export interface TimeWindow {
  id: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  durationMins?: number;
  intervalHours?: number;
  windows?: TimeWindow[];
}

export interface ScheduleSettings {
  misters: ScheduleConfig;
  fans: ScheduleConfig;
  lights: ScheduleConfig;
}

export interface SettingsData {
  setpoints: Setpoints;
  schedules?: ScheduleSettings;
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
  title?: string;
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
  declined?: boolean;
  pushToken?: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  staffId: string;
  staffName: string;
  action: 'harvest' | 'watering' | 'inspection' | 'cleaning' | 'maintenance' | 'contamination_report' | 'other';
  description: string;
  timestamp: string;        // ISO string — when the action was performed
  rackId?: string;
  rackName?: string;
  status: 'pending' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface StaffTask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;       // Staff user UID
  assignedToName: string;   // Staff display name
  assignedBy: string;       // Admin UID
  assignedByName: string;   // Admin display name
  createdAt: string;        // ISO string
  dueDate: string;          // ISO date string (YYYY-MM-DD)
  dueTime?: string;         // Optional time deadline (HH:mm)
  status: 'assigned' | 'completed' | 'overdue';
  completedAt?: string;     // ISO string — when staff marked it done
  completionNotes?: string; // Staff can add notes on completion
  isOnTime?: boolean;       // Computed: completedAt <= dueDate+dueTime
}
