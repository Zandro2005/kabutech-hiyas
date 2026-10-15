import { AlertData } from '../src/types/firebase';

describe('Alerts sorting and filtering logic', () => {
  const sampleAlerts: AlertData[] = [
    {
      id: '1',
      title: 'High Temperature',
      type: 'critical',
      message: 'Temperature exceeded 30°C',
      timestamp: '2026-10-15T01:00:00Z',
      resolved: false,
    },
    {
      id: '2',
      title: 'Low Humidity',
      type: 'warning',
      message: 'Humidity dropped below 70%',
      timestamp: '2026-10-15T02:00:00Z',
      resolved: false,
    },
    {
      id: '3',
      title: 'CO2 Optimal',
      type: 'info',
      message: 'Ventilation cycle completed',
      timestamp: '2026-10-15T03:00:00Z',
      resolved: true,
    },
    {
      id: '4',
      title: 'Water Level Critical',
      type: 'critical',
      message: 'Reservoir depleted',
      timestamp: '2026-10-14T10:00:00Z',
      resolved: true,
    },
  ];

  test('filters active unresolved alerts', () => {
    const active = sampleAlerts.filter(a => !a.resolved);
    expect(active.length).toBe(2);
    expect(active.map(a => a.id)).toEqual(['1', '2']);
  });

  test('filters critical alerts', () => {
    const critical = sampleAlerts.filter(a => a.type === 'critical');
    expect(critical.length).toBe(2);
    expect(critical.map(a => a.id)).toEqual(['1', '4']);
  });

  test('filters resolved alerts', () => {
    const resolved = sampleAlerts.filter(a => a.resolved);
    expect(resolved.length).toBe(2);
    expect(resolved.map(a => a.id)).toEqual(['3', '4']);
  });

  test('sorts by newest first', () => {
    const sorted = [...sampleAlerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    expect(sorted[0].id).toBe('3'); // 03:00
    expect(sorted[1].id).toBe('2'); // 02:00
    expect(sorted[2].id).toBe('1'); // 01:00
    expect(sorted[3].id).toBe('4'); // Oct 14
  });

  test('sorts by oldest first', () => {
    const sorted = [...sampleAlerts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    expect(sorted[0].id).toBe('4'); // Oct 14
    expect(sorted[3].id).toBe('3'); // Oct 15 03:00
  });

  test('sorts by severity high-to-low', () => {
    const severityRank = (t: string) => (t === 'critical' ? 3 : t === 'warning' ? 2 : 1);
    const sorted = [...sampleAlerts].sort((a, b) => {
      const diff = severityRank(b.type) - severityRank(a.type);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    expect(sorted[0].type).toBe('critical');
    expect(sorted[1].type).toBe('critical');
    expect(sorted[2].type).toBe('warning');
    expect(sorted[3].type).toBe('info');
  });

  test('sorts by unresolved first', () => {
    const sorted = [...sampleAlerts].sort((a, b) => {
      if (!a.resolved && b.resolved) return -1;
      if (a.resolved && !b.resolved) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    expect(sorted[0].resolved).toBe(false);
    expect(sorted[1].resolved).toBe(false);
    expect(sorted[2].resolved).toBe(true);
    expect(sorted[3].resolved).toBe(true);
  });
});
