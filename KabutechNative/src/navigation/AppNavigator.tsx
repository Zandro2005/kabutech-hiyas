import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BootScreen from '../screens/BootScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import DeviceSchedulesScreen from '../screens/DeviceSchedulesScreen';
import ReportScreen from '../screens/ReportScreen';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#004521', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#adf2bc" />
      </View>
    );
  }

  // Check if user exists and is approved
  const isAuthorized = user && profile && profile.approved;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthorized ? (
          // Authentication Stack
          <>
            <Stack.Screen name="Boot" component={BootScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="DeviceSchedules" component={DeviceSchedulesScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
