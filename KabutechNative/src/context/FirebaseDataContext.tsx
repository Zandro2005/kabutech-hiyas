import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { SensorData, SettingsData, BatchData, AlertData, StaffTask, ActivityLogEntry, UserProfile } from '../types/firebase';
import { showToast } from '../components/CustomToast';
import { computeScheduledDevicesState, computeAutoDevicesState, normalizeAppMode } from '../utils/scheduleLogic';

const defaultSensors: SensorData = {
  temperature: -999,
  humidity: -999,
  light: -999,
  co2: -999,
  waterLevel: -999,
  esp32_status: 'offline'
};

const defaultSettings: SettingsData = {
  setpoints: {
    temperature: 24,
    humidity: 70,
    light: 400,
    co2: 800,
    mode: 'auto',
    devices: {
      fanIn: false,
      fanOut: false,
      fans: false,
      misters: false,
      lights: false,
      valve: false,
      co2: false,
    }
  }
};

export const ConnectionContext = createContext<boolean>(false);
export const ServerTimeOffsetContext = createContext<number>(0);
export const SensorsContext = createContext<SensorData>(defaultSensors);
export const SettingsContext = createContext<SettingsData>(defaultSettings);
export const BatchesContext = createContext<BatchData[]>([]);
export const AlertsContext = createContext<AlertData[]>([]);
export const ActivityLogsContext = createContext<ActivityLogEntry[]>([]);
export const StaffTasksContext = createContext<StaffTask[]>([]);
export const AllUsersContext = createContext<Record<string, UserProfile>>({});

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
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

    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsubscribeOffset = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });

    if (!user) {
      return () => {
        unsubscribeConnected();
        unsubscribeOffset();
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
      const val = snapshot.val();
      if (!val) {
        setAlerts([]);
        return;
      }
      if (Array.isArray(val)) {
        setAlerts(
          val
            .map((a, idx) => {
              if (!a) return null;
              return {
                ...a,
                id: a.id || String(idx),
                firebaseKey: String(idx),
              };
            })
            .filter((a): a is AlertData => a !== null)
        );
      } else if (typeof val === 'object') {
        const list: AlertData[] = Object.entries(val).map(([k, v]: [string, any]) => ({
          ...v,
          id: v?.id || k,
          firebaseKey: k,
        }));
        setAlerts(list);
      } else {
        setAlerts([]);
      }
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
      unsubscribeOffset();
      unsubscribeSensors();
      unsubscribeSettings();
      unsubscribeBatches();
      unsubscribeAlerts();
      unsubscribeActivityLogs();
      unsubscribeStaffTasks();
      unsubscribeUsers();
    };
  }, [user?.uid]);

  const lastModeSyncPulseRef = useRef<number>(0);
  const prevEspLastSeenRef = useRef<number>(0);
  const isEspActivelyStreamingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof sensors?.last_seen === 'number' && sensors.last_seen > 0) {
      if (prevEspLastSeenRef.current > 0 && sensors.last_seen > prevEspLastSeenRef.current) {
        isEspActivelyStreamingRef.current = true;
      }
      prevEspLastSeenRef.current = sensors.last_seen;
    }
  }, [sensors?.last_seen]);

  // Continuous Bidirectional Mode Convergence & Actuator Sync Loop (App <-> ESP32 TFT)
  useEffect(() => {
    if (!user) return;
    const mode = normalizeAppMode(settings?.setpoints?.mode);

    const syncModeAndActuators = () => {
      const currentDevices = settings?.setpoints?.devices || {
        fanIn: false,
        fanOut: false,
        fans: false,
        misters: false,
        lights: false,
        valve: false,
        co2: false,
      };
      let desiredDevices = { ...currentDevices };

      if (mode === 'scheduled') {
        desiredDevices = { ...desiredDevices, ...computeScheduledDevicesState(settings?.schedules) };
      } else if (mode === 'auto') {
        desiredDevices = { ...desiredDevices, ...computeAutoDevicesState(sensors, currentDevices) };
      }

      // 1. Bidirectional Mode Convergence:
      // If the ESP32 is online and reporting a live hardware mode (e.g. "AUTO" on TFT after a brief failsafe)
      // that disagrees with the App's configured mode (e.g. "manual" or "scheduled"), push a syncPulse
      // so the ESP32 streamCallback immediately receives a JSON patch and aligns the TFT display with the App.
      const now = Date.now();
      const serverNow = now + serverTimeOffset;
      const isFreshHeartbeat =
        sensors?.esp32_status !== 'offline' &&
        typeof sensors?.last_seen === 'number' &&
        sensors.last_seen > 0 &&
        (Math.abs(serverNow - sensors.last_seen) < 12000 || isEspActivelyStreamingRef.current);

      const reportedHwMode = sensors?.mode ? normalizeAppMode(sensors.mode) : null;
      if (
        isFreshHeartbeat &&
        reportedHwMode !== null &&
        reportedHwMode !== mode &&
        now - lastModeSyncPulseRef.current > 3000
      ) {
        lastModeSyncPulseRef.current = now;
        update(ref(db, 'kabutech/settings/setpoints'), {
          mode,
          aiOverride: Boolean(settings?.setpoints?.aiOverride),
          devices: desiredDevices,
          syncPulse: now,
        }).catch(() => {});
        return;
      }

      // 2. Scheduled / Auto Actuator State Sync:
      if (mode !== 'auto' && mode !== 'scheduled') return;

      // When ESP32 is online in AUTO mode and reporting live hardware actuator states,
      // let the ESP32's on-device Edge AI + 6s relay dwell timers govern the relays without client overwrite.
      if (mode === 'auto' && isFreshHeartbeat && typeof sensors?.actuator_fans === 'boolean') {
        return;
      }

      const changed =
        desiredDevices.fanIn !== currentDevices.fanIn ||
        desiredDevices.fanOut !== currentDevices.fanOut ||
        desiredDevices.fans !== currentDevices.fans ||
        desiredDevices.misters !== currentDevices.misters ||
        desiredDevices.lights !== currentDevices.lights ||
        desiredDevices.valve !== currentDevices.valve ||
        desiredDevices.co2 !== currentDevices.co2;

      if (changed) {
        update(ref(db, 'kabutech/settings/setpoints/devices'), desiredDevices).catch(() => {});
      }
    };

    syncModeAndActuators();
    const interval = setInterval(syncModeAndActuators, 2000);
    return () => clearInterval(interval);
  }, [user?.uid, settings?.setpoints?.mode, settings?.setpoints, settings?.schedules, sensors, serverTimeOffset]);

  return (
    <ConnectionContext.Provider value={isConnected}>
      <ServerTimeOffsetContext.Provider value={serverTimeOffset}>
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
      </ServerTimeOffsetContext.Provider>
    </ConnectionContext.Provider>
  );
};
