import React, { createContext, useState, useEffect, useContext } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { SensorData, SettingsData, BatchData, AlertData, StaffTask, ActivityLogEntry, UserProfile } from '../types/firebase';
import { showToast } from '../components/CustomToast';

const defaultSensors: SensorData = {
  temperature: 0,
  humidity: 0,
  light: 0,
  co2: 0,
  esp32_status: 'offline'
};

const defaultSettings: SettingsData = {
  setpoints: {
    temperature: 24,
    humidity: 70,
    light: 400,
    co2: 800,
    mode: 'auto',
    devices: { fans: false, misters: false, lights: false, co2: false }
  }
};

export const ConnectionContext = createContext<boolean>(false);
export const SensorsContext = createContext<SensorData>(defaultSensors);
export const SettingsContext = createContext<SettingsData>(defaultSettings);
export const BatchesContext = createContext<BatchData[]>([]);
export const AlertsContext = createContext<AlertData[]>([]);
export const ActivityLogsContext = createContext<ActivityLogEntry[]>([]);
export const StaffTasksContext = createContext<StaffTask[]>([]);
export const AllUsersContext = createContext<Record<string, UserProfile>>({});

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sensors, setSensors] = useState<SensorData>(defaultSensors);
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [staffTasks, setStaffTasks] = useState<StaffTask[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});
  
  const { user } = useAuth();

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });

    if (!user) {
      return () => {
        unsubscribeConnected();
      };
    }

    const sensorsRef = ref(db, 'kabutech/sensors/live');
    const unsubscribeSensors = onValue(sensorsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setSensors(val);
    }, (error) => {
      console.error('Sensor listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Sensor data may be outdated.' });
    });

    const settingsRef = ref(db, 'kabutech/settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setSettings(val);
    }, (error) => {
      console.error('Settings listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync settings.' });
    });

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
        setBatches(batchArray.filter((b: any) => b != null));
      } else {
        setBatches([]);
      }
    }, (error) => {
      console.error('Batches listener error:', error);
      showToast({ type: 'error', text1: 'Connection Issue', text2: 'Failed to sync batch data.' });
    });

    const alertsRef = ref(db, 'kabutech/alerts');
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      setAlerts(snapshot.val() || []);
    }, (error) => {
      console.error('Alerts listener error:', error);
    });

    const activityLogsRef = ref(db, 'kabutech/logs');
    const unsubscribeActivityLogs = onValue(activityLogsRef, (snapshot) => {
      const val = snapshot.val();
      let logsArray: ActivityLogEntry[] = [];
      if (val) {
        logsArray = Object.entries(val).map(([key, v]: any) => ({ ...v, id: key }));
      }
      setActivityLogs(logsArray);
    });

    const staffTasksRef = ref(db, 'kabutech/tasks');
    const unsubscribeStaffTasks = onValue(staffTasksRef, (snapshot) => {
      const val = snapshot.val();
      let tasksArray: StaffTask[] = [];
      if (val) {
        tasksArray = Object.entries(val).map(([key, v]: any) => ({ ...v, id: key }));
      }
      setStaffTasks(tasksArray);
    });

    const usersRef = ref(db, 'kabutech/users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      setAllUsers(snapshot.val() || {});
    });

    return () => {
      unsubscribeConnected();
      unsubscribeSensors();
      unsubscribeSettings();
      unsubscribeBatches();
      unsubscribeAlerts();
      unsubscribeActivityLogs();
      unsubscribeStaffTasks();
      unsubscribeUsers();
    };
  }, [user?.uid]);

  return (
    <ConnectionContext.Provider value={isConnected}>
      <SensorsContext.Provider value={sensors}>
        <SettingsContext.Provider value={settings}>
          <BatchesContext.Provider value={batches}>
            <AlertsContext.Provider value={alerts}>
              <ActivityLogsContext.Provider value={activityLogs}>
                <StaffTasksContext.Provider value={staffTasks}>
                  <AllUsersContext.Provider value={allUsers}>
                    {children}
                  </AllUsersContext.Provider>
                </StaffTasksContext.Provider>
              </ActivityLogsContext.Provider>
            </AlertsContext.Provider>
          </BatchesContext.Provider>
        </SettingsContext.Provider>
      </SensorsContext.Provider>
    </ConnectionContext.Provider>
  );
};
