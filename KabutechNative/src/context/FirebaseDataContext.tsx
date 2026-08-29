import React, { createContext, useState, useEffect, useContext } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { SensorData, SettingsData, BatchData, AlertData, TaskData } from '../types/firebase';
import { showToast } from '../components/CustomToast';

interface FirebaseDataContextType {
  isConnected: boolean;
  sensors: SensorData;
  settings: SettingsData;
  batches: BatchData[];
  alerts: AlertData[];
  tasks: TaskData[];
}

const defaultContext: FirebaseDataContextType = {
  isConnected: false,
  sensors: {
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    esp32_status: 'offline'
  },
  settings: {
    setpoints: {
      temperature: 24,
      humidity: 70,
      light: 400,
      co2: 800,
      mode: 'auto',
      devices: { fans: false, misters: false, lights: false, co2: false }
    }
  },
  batches: [],
  alerts: [],
  tasks: []
};

export const FirebaseDataContext = createContext<FirebaseDataContextType>(defaultContext);

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FirebaseDataContextType>(defaultContext);

  useEffect(() => {
    // 1. Connection Status
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      setData(prev => ({ ...prev, isConnected: snap.val() === true }));
    });

    // 2. Sensors
    const sensorsRef = ref(db, 'kabutech/sensors/live');
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(prev => ({ ...prev, sensors: val }));
      }
    }, (error) => {
      console.error('Sensor listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Sensor data may be outdated.' });
    });

    // 3. Settings
    const settingsRef = ref(db, 'kabutech/settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(prev => ({ ...prev, settings: val }));
      }
    }, (error) => {
      console.error('Settings listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync settings.' });
    });

    // 4. Batches
    const batchesRef = ref(db, 'kabutech/batches');
    const unsubscribeBatches = onValue(batchesRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        let batchArray: BatchData[] = [];
        if (Array.isArray(val)) {
          batchArray = val.map((v, idx) => {
            if (v) v.firebaseKey = idx;
            return v;
          });
        } else if (typeof val === 'object') {
          batchArray = Object.entries(val).map(([key, v]: any) => {
            if (v) v.firebaseKey = key;
            return v;
          });
        }
        setData(prev => ({ ...prev, batches: batchArray.filter((b: any) => b != null) }));
      } else {
        setData(prev => ({ ...prev, batches: [] }));
      }
    }, (error) => {
      console.error('Batches listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync batch data.' });
    });

    // 5. Alerts
    const alertsRef = ref(db, 'kabutech/alerts');
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      setData(prev => ({ ...prev, alerts: snapshot.val() || [] }));
    }, (error) => {
      console.error('Alerts listener error:', error);
    });

    // 6. Tasks
    const tasksRef = ref(db, 'kabutech/tasks');
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const val = snapshot.val();
      let taskArray = val || [];
      if (!Array.isArray(taskArray) && typeof taskArray === 'object') {
        taskArray = Object.values(taskArray);
      }
      setData(prev => ({ ...prev, tasks: taskArray.filter((t: any) => t != null) }));
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

  return (
    <FirebaseDataContext.Provider value={data}>
      {children}
    </FirebaseDataContext.Provider>
  );
};
