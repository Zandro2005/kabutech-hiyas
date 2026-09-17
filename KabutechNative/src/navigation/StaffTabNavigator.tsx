import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStaffTasks, useSensors } from '../hooks/useFirebaseData';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { hapticLight } from '../utils/haptics';

// Import staff screens (to be created next)
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';
import StaffCropScreen from '../screens/staff/StaffCropScreen';
import StaffYieldScreen from '../screens/staff/StaffYieldScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';
import ActivityLogScreen from '../screens/staff/ActivityLogScreen';
import LiveFarmScreen from '../screens/LiveFarmScreen';
import MyTasksScreen from '../screens/staff/MyTasksScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

import FloatingCapsuleTabBar from '../components/FloatingCapsuleTabBar';

const DummyScreen = () => null;

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function StaffHomeStackNavigator() {
  return (
    <HomeStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <HomeStack.Screen name="HomeScreen" component={StaffHomeScreen} />
      <HomeStack.Screen name="LiveFarm" component={LiveFarmScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
    </HomeStack.Navigator>
  );
}

export default function StaffTabNavigator() {
  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <FloatingCapsuleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={StaffHomeStackNavigator} 
      />
      <Tab.Screen 
        name="Crop" 
        component={StaffCropScreen} 
      />
      <Tab.Screen 
        name="ActivityLog" 
        component={DummyScreen} 
      />
      <Tab.Screen 
        name="Tasks" 
        component={MyTasksScreen} 
      />
      <Tab.Screen 
        name="Yield" 
        component={StaffYieldScreen} 
      />
      <Tab.Screen 
        name="Profile" 
        component={StaffProfileScreen} 
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}
