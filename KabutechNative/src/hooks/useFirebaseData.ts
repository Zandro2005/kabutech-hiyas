import { useContext } from 'react';
import { FirebaseDataContext } from '../context/FirebaseDataContext';

export function useFirebaseConnection() {
  const context = useContext(FirebaseDataContext);
  return context.isConnected;
}

export function useSensors() {
  const context = useContext(FirebaseDataContext);
  return context.sensors;
}

export function useSettings() {
  const context = useContext(FirebaseDataContext);
  return context.settings;
}

export function useBatches() {
  const context = useContext(FirebaseDataContext);
  return context.batches;
}

export function useAlerts() {
  const context = useContext(FirebaseDataContext);
  return context.alerts;
}

export function useActivityLogs() {
  const context = useContext(FirebaseDataContext);
  return context.activityLogs;
}

export function useStaffTasks() {
  const context = useContext(FirebaseDataContext);
  return context.staffTasks;
}

export function useAllUsers() {
  const context = useContext(FirebaseDataContext);
  return context.allUsers;
}
