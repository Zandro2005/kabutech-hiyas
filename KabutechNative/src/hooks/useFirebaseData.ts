import { useContext } from 'react';
import { 
  ConnectionContext, SensorsContext, SettingsContext, 
  BatchesContext, AlertsContext, ActivityLogsContext, 
  StaffTasksContext, AllUsersContext 
} from '../context/FirebaseDataContext';

export function useFirebaseConnection() {
  return useContext(ConnectionContext);
}

export function useSensors() {
  return useContext(SensorsContext);
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useBatches() {
  return useContext(BatchesContext);
}

export function useAlerts() {
  return useContext(AlertsContext);
}

export function useActivityLogs() {
  return useContext(ActivityLogsContext);
}

export function useStaffTasks() {
  return useContext(StaffTasksContext);
}

export function useAllUsers() {
  return useContext(AllUsersContext);
}

export function calculateEnvironmentScore(temp: number, hum: number, light: number = 500, co2: number = 600): string {
  let score = 10.0;

  // Temperature penalty (Optimal: 22 - 28.5 °C)
  if (temp < 22) {
    score -= Math.min(2.5, ((22 - temp) / 10) * 2.5);
  } else if (temp > 28.5) {
    score -= Math.min(2.5, ((temp - 28.5) / 10) * 2.5);
  }

  // Humidity penalty (Optimal: 75 - 92 %)
  if (hum < 75) {
    score -= Math.min(3.0, ((75 - hum) / 35) * 3.0);
  } else if (hum > 92) {
    score -= Math.min(2.0, ((hum - 92) / 15) * 2.0);
  }

  // Light Level penalty (Optimal: 400 - 850 lx)
  if (light < 400) {
    score -= Math.min(1.5, ((400 - light) / 400) * 1.5);
  } else if (light > 850) {
    score -= Math.min(1.5, ((light - 850) / 400) * 1.5);
  }

  // CO2 penalty (Optimal: <= 750 ppm)
  if (co2 > 750) {
    score -= Math.min(2.5, ((co2 - 750) / 600) * 2.5);
  }

  return Math.max(1.0, Math.min(10.0, score)).toFixed(1);
}
