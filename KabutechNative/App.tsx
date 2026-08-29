import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
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

import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Initialize Tailwind device context to listen for color scheme changes
  useDeviceContext(tw);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#072211', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#adf2bc" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <FirebaseDataProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <ErrorBoundary>
              <AppNavigator />
            </ErrorBoundary>
            <CustomToast />
          </SafeAreaProvider>
        </FirebaseDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
