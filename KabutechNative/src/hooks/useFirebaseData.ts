import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { SensorData, SettingsData, BatchData, AlertData, TaskData } from '../types/firebase';

export function useFirebaseData() {
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    esp32_status: 'offline'
  });
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
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connection status
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    }, (error) => {
      console.error('Connection listener error:', error);
    });

    // Live Sensors
    const sensorsRef = ref(db, 'kabutech/sensors/live');
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensors(data);
      }
    }, (error) => {
      console.error('Sensor listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Sensor data may be outdated.' });
    });

    // Settings (Setpoints & Devices)
    const settingsRef = ref(db, 'kabutech/settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      }
    }, (error) => {
      console.error('Settings listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync settings.' });
    });

    // Batches
    const batchesRef = ref(db, 'kabutech/batches');
    const unsubscribeBatches = onValue(batchesRef, (snapshot) => {
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

    // Alerts
    const alertsRef = ref(db, 'kabutech/alerts');
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      setAlerts(snapshot.val() || []);
    }, (error) => {
      console.error('Alerts listener error:', error);
    });

    // Tasks
    const tasksRef = ref(db, 'kabutech/tasks');
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      let taskArray = data || [];
      if (!Array.isArray(taskArray) && typeof taskArray === 'object') {
        taskArray = Object.values(taskArray);
      }
      setTasks(taskArray.filter((t: any) => t != null));
    }, (error) => {
      console.error('Tasks listener error:', error);
    });

    return () => {
      unsubscribeConnected();
      unsubscribeSensors();
      unsubscribeSettings();
      unsubscribeBatches();
      unsubscribeAlerts();
      unsubscribeTasks();
    };
  }, []);

  return { isConnected, sensors, settings, batches, alerts, tasks };
}
