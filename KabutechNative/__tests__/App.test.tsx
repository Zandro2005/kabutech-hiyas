import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';

// Mock dependencies that would otherwise cause issues in a plain Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@react-native-community/slider', () => 'Slider');

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(),
}));

// Mock Expo components
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
}));
jest.mock('@expo-google-fonts/plus-jakarta-sans', () => ({
  PlusJakartaSans_400Regular: 'PlusJakartaSans_400Regular',
  PlusJakartaSans_700Bold: 'PlusJakartaSans_700Bold',
  PlusJakartaSans_800ExtraBold: 'PlusJakartaSans_800ExtraBold',
}));

describe('App', () => {
  it('renders without crashing', () => {
    renderer.create(<App />);
    expect(true).toBeTruthy();
  });
});
