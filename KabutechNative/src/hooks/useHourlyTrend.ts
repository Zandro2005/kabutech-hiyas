import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, get, query, orderByKey, startAt, endAt } from 'firebase/database';
import { db } from '../services/firebase';
import { useSensors } from './useFirebaseData';
import { SensorHistoryRecord } from '../types/firebase';

export type TrendDirection = 'up' | 'down' | 'steady' | 'none';

export interface MetricTrend {
  direction: TrendDirection;
  deltaText: string;
  iconName: 'trending-up' | 'trending-down' | 'trending-neutral' | 'minus';
  deltaValue: number | null;
}

export interface ChamberTrends {
  temp: MetricTrend;
  hum: MetricTrend;
  co2: MetricTrend;
  light: MetricTrend;
  hasHistory: boolean;
  isLoading: boolean;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_TREND: MetricTrend = {
  direction: 'none',
  deltaText: 'Live',
  iconName: 'minus',
  deltaValue: null,
};

export function useHourlyTrend(): ChamberTrends {
  const sensors = useSensors();
  const [lastHourData, setLastHourData] = useState<{
    temp?: number;
    hum?: number;
    co2?: number;
    light?: number;
    timestamp?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLatestHistory = useCallback(async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const startKey = formatDateKey(yesterday);
      const endKey = formatDateKey(now);

      const historyRef = ref(db, 'kabutech/sensors/history');
      const historyQuery = query(
        historyRef,
        orderByKey(),
        startAt(startKey),
        endAt(endKey)
      );

      const snapshot = await get(historyQuery);
      if (!snapshot.exists()) {
        setLastHourData(null);
        setIsLoading(false);
        return;
      }

      const val = snapshot.val() as Record<string, Record<string, SensorHistoryRecord>>;
      const entries: Array<{
        timestamp: number;
        temp: number;
        hum: number;
        co2: number;
        light: number;
      }> = [];

      Object.keys(val).forEach(dateStr => {
        const hoursObj = val[dateStr];
        if (!hoursObj || typeof hoursObj !== 'object') return;

        Object.keys(hoursObj).forEach(hourStr => {
          const rec = hoursObj[hourStr];
          if (!rec) return;

          let ts = rec.timestamp;
          if (!ts || typeof ts !== 'number' || ts < 1000000000) {
            const hourNum = parseInt(hourStr, 10) || 0;
            const parsed = new Date(`${dateStr}T${String(hourNum).padStart(2, '0')}:00:00+08:00`);
            ts = !isNaN(parsed.getTime()) ? parsed.getTime() : 0;
          }

          entries.push({
            timestamp: ts,
            temp: typeof rec.temp === 'number' ? rec.temp : -999,
            hum: typeof rec.hum === 'number' ? rec.hum : -999,
            co2: typeof rec.co2 === 'number' ? rec.co2 : -999,
            light: typeof rec.light === 'number' ? rec.light : -999,
          });
        });
      });

      entries.sort((a, b) => a.timestamp - b.timestamp);
      // Grab the most recent hourly entry
      const latest = entries[entries.length - 1];
      if (latest) {
        setLastHourData({
          temp: latest.temp !== -999 ? latest.temp : undefined,
          hum: latest.hum !== -999 ? latest.hum : undefined,
          co2: latest.co2 !== -999 ? latest.co2 : undefined,
          light: latest.light !== -999 ? latest.light : undefined,
          timestamp: latest.timestamp,
        });
      } else {
        setLastHourData(null);
      }
    } catch (err) {
      console.warn('[useHourlyTrend] History trend fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestHistory();
    // Poll hourly trend comparison every 5 minutes
    const interval = setInterval(fetchLatestHistory, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLatestHistory]);

  const trends = useMemo(() => {
    const liveTemp = typeof sensors?.temperature === 'number' && sensors.temperature > 0 && sensors.temperature !== -999 ? sensors.temperature : null;
    const liveHum = typeof sensors?.humidity === 'number' && sensors.humidity > 0 && sensors.humidity !== -999 ? sensors.humidity : null;
    const liveCo2 = typeof sensors?.co2 === 'number' && sensors.co2 > 0 && sensors.co2 !== -999 ? sensors.co2 : null;
    const liveLight = typeof sensors?.light === 'number' && sensors.light >= 0 && sensors.light !== -999 ? sensors.light : null;

    const hasHistory = Boolean(lastHourData);

    const calcTrend = (
      liveVal: number | null,
      histVal: number | undefined,
      deadband: number,
      unit: string,
      isFloat: boolean = false
    ): MetricTrend => {
      if (liveVal == null || histVal == null || histVal === -999) {
        return DEFAULT_TREND;
      }
      const delta = liveVal - histVal;
      const absDelta = Math.abs(delta);

      if (absDelta <= deadband) {
        return {
          direction: 'steady',
          deltaText: 'Steady',
          iconName: 'trending-neutral',
          deltaValue: 0,
        };
      }

      const isUp = delta > 0;
      const formatted = isFloat ? absDelta.toFixed(1) : Math.round(absDelta).toString();
      const sign = isUp ? '+' : '-';

      return {
        direction: isUp ? 'up' : 'down',
        deltaText: `${sign}${formatted}${unit} 1h`,
        iconName: isUp ? 'trending-up' : 'trending-down',
        deltaValue: Number(delta.toFixed(1)),
      };
    };

    return {
      temp: calcTrend(liveTemp, lastHourData?.temp, 0.3, '°', true),
      hum: calcTrend(liveHum, lastHourData?.hum, 1.0, '%', false),
      co2: calcTrend(liveCo2, lastHourData?.co2, 25, ' ppm', false),
      light: calcTrend(liveLight, lastHourData?.light, 30, ' lx', false),
      hasHistory,
      isLoading,
    };
  }, [sensors, lastHourData, isLoading]);

  return trends;
}
