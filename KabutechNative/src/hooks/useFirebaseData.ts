import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { SensorData, SettingsData, BatchData, AlertData, TaskData } from '../types/firebase';

export function useFirebaseConnection() {
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });
    return () => unsubscribe();
  }, []);
  return isConnected;
}

export function useSensors() {
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    esp32_status: 'offline'
  });

  useEffect(() => {
    const sensorsRef = ref(db, 'kabutech/sensors/live');
    const unsubscribe = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSensors(data);
    }, (error) => {
      console.error('Sensor listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Sensor data may be outdated.' });
    });
    return () => unsubscribe();
  }, []);

  return sensors;
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsData>({
    setpoints: {
      temperature: 24,
      humidity: 70,
      light: 400,
      co2: 800,
      mode: 'auto',
      devices: { fans: false, misters: false, lights: false, co2: false }
    }
  });

  useEffect(() => {
    const settingsRef = ref(db, 'kabutech/settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    }, (error) => {
      console.error('Settings listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync settings.' });
    });
    return () => unsubscribe();
  }, []);

  return settings;
}

export function useBatches() {
  const [batches, setBatches] = useState<BatchData[]>([]);

  useEffect(() => {
    const batchesRef = ref(db, 'kabutech/batches');
    const unsubscribe = onValue(batchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let batchArray: BatchData[] = [];
        if (Array.isArray(data)) {
          batchArray = data.map((val, idx) => {
            if (val) val.firebaseKey = idx;
            return val;
          });
        } else if (typeof data === 'object') {
          batchArray = Object.entries(data).map(([key, val]: any) => {
            if (val) val.firebaseKey = key;
            return val;
          });
        }
        setBatches(batchArray.filter((b: any) => b != null));
      } else {
        setBatches([]);
      }
    }, (error) => {
      console.error('Batches listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync batch data.' });
    });
    return () => unsubscribe();
  }, []);

  return batches;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const alertsRef = ref(db, 'kabutech/alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      setAlerts(snapshot.val() || []);
    }, (error) => {
      console.error('Alerts listener error:', error);
    });
    return () => unsubscribe();
  }, []);

  return alerts;
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskData[]>([]);

  useEffect(() => {
    const tasksRef = ref(db, 'kabutech/tasks');
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      let taskArray = data || [];
      if (!Array.isArray(taskArray) && typeof taskArray === 'object') {
        taskArray = Object.values(taskArray);
      }
      setTasks(taskArray.filter((t: any) => t != null));
    }, (error) => {
      console.error('Tasks listener error:', error);
    });
    return () => unsubscribe();
  }, []);

  return tasks;
}
