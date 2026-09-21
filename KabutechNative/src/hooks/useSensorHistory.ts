import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, get, query, orderByKey, startAt, endAt } from 'firebase/database';
import { db } from '../services/firebase';
import { AnalyticsTimeRange, SensorHistoryRecord } from '../types/firebase';

export type MetricType = 'temp' | 'hum' | 'light' | 'co2';

export interface HistoryPoint {
  timestamp: number;
  value: number;
  time: string;       // e.g. "2:00 PM" or "Sep 20, 2:00 PM"
  axisLabel: string;  // Short label for chart x-axis e.g. "14:00", "Mon", "Sep 15"
}

export interface SensorHistoryResult {
  data: HistoryPoint[];
  isLoading: boolean;
  isError: boolean;
  min: number | null;
  max: number | null;
  avg: number | null;
  reload: () => Promise<void>;
}

interface RawHistoryEntry {
  timestamp: number;
  temp: number;
  hum: number;
  light: number;
  co2: number;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useSensorHistory(metric: MetricType, range: AnalyticsTimeRange): SensorHistoryResult {
  const [rawRecords, setRawRecords] = useState<RawHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Determine date bounds based on range
  const { startDateStr, endDateStr, cutoffTimestamp } = useMemo(() => {
    const now = new Date();
    let daysBack = 2; // For 24H: yesterday and today

    if (range === '7D') {
      daysBack = 8;
    } else if (range === '30D') {
      daysBack = 31;
    }

    const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const msMap: Record<AnalyticsTimeRange, number> = {
      '24H': 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
      '30D': 30 * 24 * 60 * 60 * 1000,
    };

    return {
      startDateStr: formatDateKey(start),
      endDateStr: formatDateKey(end),
      cutoffTimestamp: now.getTime() - msMap[range],
    };
  }, [range]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const historyRef = ref(db, 'kabutech/sensors/history');
      const historyQuery = query(
        historyRef,
        orderByKey(),
        startAt(startDateStr),
        endAt(endDateStr)
      );

      const snapshot = await get(historyQuery);
      if (!snapshot.exists()) {
        setRawRecords([]);
        setIsLoading(false);
        return;
      }

      const val = snapshot.val() as Record<string, Record<string, SensorHistoryRecord>>;
      const entries: RawHistoryEntry[] = [];

      Object.keys(val).forEach(dateStr => {
        const hoursObj = val[dateStr];
        if (!hoursObj || typeof hoursObj !== 'object') return;

        Object.keys(hoursObj).forEach(hourStr => {
          const rec = hoursObj[hourStr];
          if (!rec) return;

          // Resolve timestamp
          let ts = rec.timestamp;
          if (!ts || typeof ts !== 'number' || ts < 1000000000) {
            // Fallback: parse from dateStr and hourStr (assumed local/UTC+8)
            const hourNum = parseInt(hourStr, 10) || 0;
            const parsed = new Date(`${dateStr}T${String(hourNum).padStart(2, '0')}:00:00+08:00`);
            ts = !isNaN(parsed.getTime()) ? parsed.getTime() : Date.now();
          }

          entries.push({
            timestamp: ts,
            temp: typeof rec.temp === 'number' ? rec.temp : -999,
            hum: typeof rec.hum === 'number' ? rec.hum : -999,
            light: typeof rec.light === 'number' ? rec.light : -999,
            co2: typeof rec.co2 === 'number' ? rec.co2 : -999,
          });
        });
      });

      // Sort chronologically ascending
      entries.sort((a, b) => a.timestamp - b.timestamp);
      setRawRecords(entries);
    } catch (err) {
      console.warn('[useSensorHistory] Error fetching history:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process and downsample points according to Option A
  const data: HistoryPoint[] = useMemo(() => {
    if (!rawRecords.length) return [];

    // Filter by cutoff and remove disconnected/unplugged (-999) values for the active metric
    const validFiltered = rawRecords.filter(r => {
      if (r.timestamp < cutoffTimestamp) return false;
      const val = r[metric];
      return typeof val === 'number' && val !== -999 && !isNaN(val);
    });

    if (!validFiltered.length) return [];

    if (range === '24H') {
      // Raw hourly points (up to ~24 points)
      return validFiltered.map(r => {
        const d = new Date(r.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        const axisStr = `${h12} ${ampm}`;
        return {
          timestamp: r.timestamp,
          value: Number(r[metric].toFixed(1)),
          time: timeStr,
          axisLabel: axisStr,
        };
      });
    }

    if (range === '7D') {
      // Downsample to 4-hour buckets (~42 points)
      const bucketMs = 4 * 60 * 60 * 1000;
      const buckets: Record<number, { sum: number; count: number; timestamp: number }> = {};

      validFiltered.forEach(r => {
        const bucketKey = Math.floor(r.timestamp / bucketMs) * bucketMs;
        if (!buckets[bucketKey]) {
          buckets[bucketKey] = { sum: 0, count: 0, timestamp: bucketKey };
        }
        buckets[bucketKey].sum += r[metric];
        buckets[bucketKey].count += 1;
      });

      return Object.keys(buckets)
        .map(Number)
        .sort((a, b) => a - b)
        .map(key => {
          const b = buckets[key];
          const avgVal = b.sum / b.count;
          const d = new Date(b.timestamp);
          const dayName = d.toLocaleDateString([], { weekday: 'short' });
          const timeShort = d.toLocaleTimeString([], { hour: 'numeric' });
          return {
            timestamp: b.timestamp,
            value: Number(avgVal.toFixed(1)),
            time: `${dayName} ${timeShort}`,
            axisLabel: dayName,
          };
        });
    }

    // 30D: Downsample to 4-hour buckets (~180 points) for smooth curve with clear date progression
    const bucketMs = 4 * 60 * 60 * 1000;
    const buckets: Record<number, { sum: number; count: number; timestamp: number }> = {};

    validFiltered.forEach(r => {
      const bucketKey = Math.floor(r.timestamp / bucketMs) * bucketMs;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { sum: 0, count: 0, timestamp: bucketKey };
      }
      buckets[bucketKey].sum += r[metric];
      buckets[bucketKey].count += 1;
    });

    return Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b)
      .map(key => {
        const b = buckets[key];
        const avgVal = b.sum / b.count;
        const d = new Date(b.timestamp);
        const monthDay = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const timeShort = d.toLocaleTimeString([], { hour: 'numeric' });
        return {
          timestamp: b.timestamp,
          value: Number(avgVal.toFixed(1)),
          time: `${monthDay}, ${timeShort}`,
          axisLabel: monthDay,
        };
      });
  }, [rawRecords, cutoffTimestamp, metric, range]);

  // Compute min, max, avg
  const { min, max, avg } = useMemo(() => {
    if (!data.length) {
      return { min: null, max: null, avg: null };
    }
    let minVal = data[0].value;
    let maxVal = data[0].value;
    let sum = 0;

    data.forEach(d => {
      if (d.value < minVal) minVal = d.value;
      if (d.value > maxVal) maxVal = d.value;
      sum += d.value;
    });

    const avgVal = sum / data.length;

    return {
      min: Number(minVal.toFixed(1)),
      max: Number(maxVal.toFixed(1)),
      avg: Number(avgVal.toFixed(1)),
    };
  }, [data]);

  return {
    data,
    isLoading,
    isError,
    min,
    max,
    avg,
    reload: fetchData,
  };
}
