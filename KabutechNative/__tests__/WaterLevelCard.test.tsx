import React from 'react';
import renderer, { act } from 'react-test-renderer';
import WaterLevelCard from '../src/components/WaterLevelCard';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
  Path: () => null,
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({ isSmallDevice: false, width: 375, height: 812 }),
}));

jest.mock('../src/utils/haptics', () => ({
  hapticSelection: jest.fn(),
}));

jest.mock('../src/hooks/useSensorHealth', () => ({
  useSensorHealth: () => ({
    isControllerOnline: true,
    isStale: false,
    dhtError: false,
    tempError: false,
    humError: false,
    lightError: false,
    co2Error: false,
    waterError: false,
    offlineSeconds: 0,
    hasAnyError: false,
    faultySensorsList: [],
  }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-admin' },
    profile: { role: 'admin' },
    isLoading: false,
  }),
}));

describe('WaterLevelCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders optimal level correctly', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(<WaterLevelCard waterLevel={80} capacityLiters={20} />);
    });
    expect(testRenderer).toBeDefined();
    expect(testRenderer.toJSON()).toBeTruthy();
  });

  it('renders low level correctly', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(<WaterLevelCard waterLevel={35} capacityLiters={20} />);
    });
    expect(testRenderer).toBeDefined();
    expect(testRenderer.toJSON()).toBeTruthy();
  });

  it('renders critical level correctly', () => {
    let testRenderer: any;
    act(() => {
      testRenderer = renderer.create(<WaterLevelCard waterLevel={10} capacityLiters={20} />);
    });
    expect(testRenderer).toBeDefined();
    expect(testRenderer.toJSON()).toBeTruthy();
  });
});
