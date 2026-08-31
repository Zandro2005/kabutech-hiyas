import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { FirebaseDataProvider } from './src/context/FirebaseDataContext';
import { useDeviceContext } from 'twrnc';
import tw from './src/tailwind';
import CustomToast from './src/components/CustomToast';
import { SoundManager } from './src/utils/SoundManager';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, Alert as RNAlert, LogBox } from 'react-native';

LogBox.ignoreLogs([
  '`transition-all` unknown or invalid utility',
  'InteractionManager has been deprecated',
]);

const originalAlert = RNAlert.alert;
RNAlert.alert = (title, message, buttons, options) => {
  if (title && (title.toLowerCase().includes('error') || title.toLowerCase().includes('invalid') || title.toLowerCase().includes('fail'))) {
    SoundManager.playError();
  }
  originalAlert(title, message, buttons, options);
};

import ErrorBoundary from './src/components/ErrorBoundary';
import GlobalAlarmModal from './src/components/GlobalAlarmModal';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Initialize Tailwind device context to listen for color scheme changes, but ignore system scheme
  useDeviceContext(tw, { observeDeviceColorSchemeChanges: false });

  useEffect(() => {
    async function loadResources() {
      try {
        await Promise.all([
          Font.loadAsync({
            PlusJakartaSans_400Regular,
            PlusJakartaSans_700Bold,
            PlusJakartaSans_800ExtraBold,
          }),
          Asset.loadAsync([
            require('./assets/mushroom_bg.png'),
            require('./assets/mushroom_feed.png'),
            require('./assets/icon.png'),
          ]),
          SoundManager.init(),
        ]);
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadResources();
  }, []);

  useEffect(() => {
    // Re-enable immersive mode (hidden until swipe)
    async function configureNavBar() {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('inset-swipe');
          await NavigationBar.setPositionAsync('absolute');
          await NavigationBar.setBackgroundColorAsync('#00000000');
        } catch (e) {}
      }
    }
    configureNavBar();
  }, []);

  if (!fontsLoaded) {
    return null; // Native splash screen remains visible
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <FirebaseDataProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <ErrorBoundary>
              <AppNavigator />
              <GlobalAlarmModal />
            </ErrorBoundary>
            <CustomToast />
          </SafeAreaProvider>
        </FirebaseDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
