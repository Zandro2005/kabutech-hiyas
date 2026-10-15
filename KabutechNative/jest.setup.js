/* eslint-env jest */

// 1. Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 2. Mock Firebase SDK
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [{}]),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn((auth, cb) => {
    if (typeof cb === 'function') cb(null);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/database', () => {
  const dummyRef = {
    push: jest.fn(() => ({ key: 'mock-key' })),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
  };
  return {
    getDatabase: jest.fn(() => ({})),
    ref: jest.fn(() => dummyRef),
    onValue: jest.fn((refObj, cb) => {
      if (typeof cb === 'function') {
        cb({
          val: () => null,
          exists: () => false,
        });
      }
      return jest.fn();
    }),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    push: jest.fn(() => ({ key: 'mock-key' })),
    get: jest.fn(() => Promise.resolve({ val: () => null, exists: () => false })),
    serverTimestamp: jest.fn(() => Date.now()),
  };
});

// 3. Mock Expo Audio & Media
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    volume: 1.0,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    release: jest.fn(),
    currentTime: 0,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  preload: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-volume-manager', () => ({
  VolumeManager: {
    getVolume: jest.fn(() => Promise.resolve({ volume: 1.0 })),
    setVolume: jest.fn(() => Promise.resolve()),
    showNativeVolumeUI: jest.fn(),
  },
}));

// 4. Mock Expo Haptics & Navigation Bar
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-navigation-bar', () => ({
  NavigationBar: {
    setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
    setButtonStyleAsync: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// 5. Mock Vector Icons & Google Fonts
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@expo-google-fonts/plus-jakarta-sans', () => ({
  PlusJakartaSans_400Regular: 'PlusJakartaSans_400Regular',
  PlusJakartaSans_500Medium: 'PlusJakartaSans_500Medium',
  PlusJakartaSans_600SemiBold: 'PlusJakartaSans_600SemiBold',
  PlusJakartaSans_700Bold: 'PlusJakartaSans_700Bold',
  PlusJakartaSans_800ExtraBold: 'PlusJakartaSans_800ExtraBold',
}));

// 6. Mock twrnc and community controls
jest.mock('twrnc', () => {
  const actual = jest.requireActual('twrnc');
  return {
    ...actual,
    useDeviceContext: jest.fn(),
  };
});

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@react-native-community/slider', () => 'Slider');

// 8. Mock Status Bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

const { NativeModules } = require('react-native');
if (NativeModules) {
  NativeModules.StatusBarManager = {
    ...(NativeModules.StatusBarManager || {}),
    setNetworkActivityIndicatorVisible: jest.fn(),
    setColor: jest.fn(),
    setStyle: jest.fn(),
    setHidden: jest.fn(),
    getHeight: jest.fn((cb) => cb && cb({ height: 20 })),
  };
}

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const View = require('react-native').View;
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(inset);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    initialWindowMetrics: {
      insets: inset,
      frame: frame,
    },
  };
});


// 9. Mock react-native-screens
jest.mock('react-native-screens', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    enableScreens: jest.fn(),
    enableFreeze: jest.fn(),
    screensEnabled: jest.fn(() => false),
    Screen: ({ children, ...props }) => React.createElement(View, props, children),
    ScreenContainer: ({ children, ...props }) => React.createElement(View, props, children),
    ScreenStack: ({ children, ...props }) => React.createElement(View, props, children),
    ScreenStackItem: ({ children, ...props }) => React.createElement(View, props, children),
    ScreenStackHeaderConfig: () => null,
    ScreenStackHeaderSubview: () => null,
    SearchBar: () => null,
    FullWindowOverlay: ({ children }) => children,
    compatibilityFlags: {},
  };
});






