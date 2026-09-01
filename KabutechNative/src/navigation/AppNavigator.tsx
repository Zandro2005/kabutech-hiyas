import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BootScreen from '../screens/BootScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import StaffTabNavigator from './StaffTabNavigator';
import DeviceSchedulesScreen from '../screens/DeviceSchedulesScreen';
import ReportScreen from '../screens/ReportScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import StaffReportsInboxScreen from '../screens/StaffReportsInboxScreen';
import StaffApprovalsScreen from '../screens/StaffApprovalsScreen';
import AssignTaskScreen from '../screens/AssignTaskScreen';
import StaffTaskHistoryScreen from '../screens/StaffTaskHistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import LiveFarmScreen from '../screens/LiveFarmScreen';
import MyActivityHistoryScreen from '../screens/staff/MyActivityHistoryScreen';
import MyTasksScreen from '../screens/staff/MyTasksScreen';
import ActivityLogScreen from '../screens/staff/ActivityLogScreen';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, profile, isLoading } = useAuth();

  // Inside the component...
  useEffect(() => {
    if (!isLoading) {
      // Hide the native splash screen smoothly once auth is resolved and the tree is ready
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return null; // Native splash screen remains visible
  }

  // Check if user exists and is approved
  const isAuthenticated = !!user && !!profile;
  const isApproved = profile?.approved === true;
  const isStaff = profile?.role === 'staff';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Authentication Stack
          <>
            <Stack.Screen name="Boot" component={BootScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !isApproved ? (
          // Pending Approval
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : isStaff ? (
          // Staff App Stack
          <>
            <Stack.Screen name="StaffMain" component={StaffTabNavigator} />
            <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
            <Stack.Screen name="MyActivityHistory" component={MyActivityHistoryScreen} />
            <Stack.Screen name="MyTasks" component={MyTasksScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="LiveFarm" component={LiveFarmScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="DeviceSchedules" component={DeviceSchedulesScreen} />
          </>
        ) : (
          // Admin App Stack
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="DeviceSchedules" component={DeviceSchedulesScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="StaffReportsInbox" component={StaffReportsInboxScreen} />
            <Stack.Screen name="StaffApprovals" component={StaffApprovalsScreen} />
            <Stack.Screen name="AssignTask" component={AssignTaskScreen} />
            <Stack.Screen name="StaffTaskHistory" component={StaffTaskHistoryScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="LiveFarm" component={LiveFarmScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
