import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../services/firebase';

export function useFirebaseData() {
  const [sensors, setSensors] = useState<any>({
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    esp32_status: 'offline'
  });
  const [settings, setSettings] = useState<any>({
    setpoints: {
      temperature: 24,
      humidity: 70,
      light: 400,
      co2: 800,
      devices: { fans: false, misters: false, lights: false, co2: false }
    }
  });
  const [batches, setBatches] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connection status
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });

    // Live Sensors
    const sensorsRef = ref(db, 'kabutech/sensors/live');
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensors(data);
      }
    });

    // Settings (Setpoints & Devices)
    const settingsRef = ref(db, 'kabutech/settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      }
    });

    // Batches
    const batchesRef = ref(db, 'kabutech/batches');
    const unsubscribeBatches = onValue(batchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let batchArray: any[] = [];
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
    });

    // Alerts
    const alertsRef = ref(db, 'kabutech/alerts');
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      setAlerts(snapshot.val() || []);
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
