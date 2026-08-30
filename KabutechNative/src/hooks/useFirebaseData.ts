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
