import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AwwSnapOfflineView from '../src/components/AwwSnapOfflineView';
import RangeGauge from '../src/components/RangeGauge';
import ChamberStatusHero from '../src/components/ChamberStatusHero';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
  Circle: () => null,
  Defs: ({ children }: any) => children,
  LinearGradient: ({ children }: any) => children,
  Stop: () => null,
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({ isSmallDevice: false, isLargeDevice: false, width: 375, height: 812 }),
}));

jest.mock('../src/utils/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticLight: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-operator' },
    profile: { name: 'Juan Dela Cruz', role: 'operator' },
    isLoading: false,
  }),
}));

function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (node.children) return extractText(node.children);
  if (node.props && node.props.children) return extractText(node.props.children);
  return '';
}

describe('AwwSnapOfflineView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders dashboard variant with only Aw, Snap! headline and message (no pills, no yellow)', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(
        <AwwSnapOfflineView
          variant="dashboard"
          isDarkMode={false}
        />
      );
    });

    const fullText = extractText(testRenderer.toJSON());

    // Only Aw, Snap! and the message
    expect(fullText).toContain('Aw, Snap!');
    expect(fullText).toContain('Chamber telemetry is paused');
    // Ensure no pills
    expect(fullText).not.toContain('CONTROLLER OFFLINE');
    expect(fullText).not.toContain('Telemetry:');
    expect(fullText).not.toContain('Failsafe:');
  });

  it('renders control variant with only Aw, Snap! and parameter message', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(
        <AwwSnapOfflineView
          variant="control"
          metricLabel="Temperature"
          isDarkMode={true}
        />
      );
    });

    const fullText = extractText(testRenderer.toJSON());

    expect(fullText).toContain('Aw, Snap!');
    expect(fullText).toContain('Live Temperature gauge is unavailable');
    // Ensure no pills
    expect(fullText).not.toContain('Target Crop Range');
  });

  it('RangeGauge renders AwwSnapOfflineView when isOffline is true and deletes circle gauge', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(
        <RangeGauge
          scaleMin={0}
          scaleMax={50}
          band={{ min: 18, max: 25 }}
          current={24}
          color="#3b82f6"
          unit="°C"
          label="Temperature"
          isDarkMode={false}
          isOffline={true}
        />
      );
    });

    const fullText = extractText(testRenderer.toJSON());

    // Aw, Snap! replaces the circle
    expect(fullText).toContain('Aw, Snap!');
    expect(fullText).toContain('Live Temperature gauge is unavailable');
    // Does NOT render live reading or circular gauge text
    expect(fullText).not.toContain('CURRENT READING');
  });

  it('ChamberStatusHero renders AwwSnapOfflineView when isOffline is true and deletes parameter in range circle', () => {
    const mockEval: any = {
      inRangeCount: 0,
      total: 4,
      statusLabel: 'Offline',
      badgeColor: '#94a3b8',
      summary: 'Controller offline - Check connection',
      params: {
        temp: { state: 'fault', statusLabel: 'Offline', severity: 'none' },
        hum: { state: 'fault', statusLabel: 'Offline', severity: 'none' },
        light: { state: 'fault', statusLabel: 'Offline', severity: 'none' },
        co2: { state: 'fault', statusLabel: 'Offline', severity: 'none' },
      },
      profile: { name: 'Pleurotus ostreatus', scientificName: 'P. ostreatus', stage: 'fruiting' },
    };

    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(
        <ChamberStatusHero
          evaluation={mockEval}
          isAuto={true}
          isDarkMode={false}
          isOffline={true}
          navigation={{ navigate: jest.fn() }}
        />
      );
    });

    const fullText = extractText(testRenderer.toJSON());

    // Aw, Snap! replaces the circle dial
    expect(fullText).toContain('Aw, Snap!');
    expect(fullText).toContain('Chamber telemetry is paused');
    // Does NOT render the "Parameters In Range" circle text
    expect(fullText).not.toContain('Parameters In Range');
  });

  it('ChamberStatusHero renders parameter in range circle when isOffline is false', () => {
    const mockEval: any = {
      inRangeCount: 4,
      total: 4,
      statusLabel: 'Optimal',
      badgeColor: '#10b981',
      summary: 'All 4 parameters within crop range',
      params: {
        temp: { state: 'in_range', statusLabel: 'OK', severity: 'none' },
        hum: { state: 'in_range', statusLabel: 'OK', severity: 'none' },
        light: { state: 'in_range', statusLabel: 'OK', severity: 'none' },
        co2: { state: 'in_range', statusLabel: 'OK', severity: 'none' },
      },
      profile: { name: 'Pleurotus ostreatus', scientificName: 'P. ostreatus', stage: 'fruiting' },
    };

    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(
        <ChamberStatusHero
          evaluation={mockEval}
          isAuto={true}
          isDarkMode={false}
          isOffline={false}
          navigation={{ navigate: jest.fn() }}
        />
      );
    });

    const fullText = extractText(testRenderer.toJSON());

    // When online, "Parameters In Range" circle IS rendered
    expect(fullText).toContain('Parameters In Range');
    expect(fullText).not.toContain('Aw, Snap!');
  });
});
