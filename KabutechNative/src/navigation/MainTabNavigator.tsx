import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Platform, TouchableOpacity, Text, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import LiveFarmScreen from '../screens/LiveFarmScreen';
import ControlsScreen from '../screens/ControlsScreen';
import YieldScreen from '../screens/YieldScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ManageCropScreen from '../screens/ManageCropScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AddBatchModal from '../components/modals/AddBatchModal';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { useSensors } from '../hooks/useFirebaseData';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { ref, update } from 'firebase/database';
import { hapticLight } from '../utils/haptics';
import FloatingCapsuleTabBar from '../components/FloatingCapsuleTabBar';

const DummyScreen = () => null;

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen name="LiveFarm" component={LiveFarmScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
    </HomeStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const [addBatchVisible, setAddBatchVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const envAlerts = useEnvironmentAlerts();
  const hasWarning = envAlerts.hasWarning;
  const hasCritical = envAlerts.hasCritical;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('showManualOverrideModal', () => {
      setOverrideModalVisible(true);
    });
    return () => sub.remove();
  }, []);

  const confirmManualMode = () => {
    update(ref(db, 'kabutech/settings/setpoints'), {
      mode: 'manual'
    }).then(() => {
      showToast({ type: 'success', text1: 'Switched to MANUAL Mode' });
    });
    setOverrideModalVisible(false);
  };

  return (
    <>
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <FloatingCapsuleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator} 
      />
      <Tab.Screen 
        name="Controls" 
        component={ControlsScreen} 
      />
      <Tab.Screen 
        name="AddAction" 
        component={DummyScreen} 
      />
      <Tab.Screen 
        name="ManageCrop" 
        component={ManageCropScreen} 
      />
      <Tab.Screen 
        name="Yield" 
        component={YieldScreen} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
    <AddBatchModal visible={addBatchVisible} onClose={() => setAddBatchVisible(false)} />

    {/* Manual Override Confirmation Modal Overlay */}
    {overrideModalVisible && (
      <BlurView 
        intensity={100}
        tint="dark"
        style={[tw`absolute top-0 left-0 right-0 bottom-0 items-center justify-center p-4 z-50`, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
      >
        <View style={tw`bg-white dark:bg-slate-800 rounded-[28px] p-5 w-full max-w-[280px] items-center shadow-xl`}>
          
          {/* Orange Icon */}
          <View style={tw`w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-3`}>
            <MaterialCommunityIcons name="tune-variant" size={20} color="#f97316" />
          </View>

          <Text style={[tw`text-base text-slate-800 dark:text-slate-100 text-center mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            Switch to Manual?
          </Text>
          
          <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 text-center mb-5 leading-tight`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
            This disables the auto control loop. You will be fully responsible for managing devices manually.
          </Text>

          <View style={tw`flex-row gap-2 w-full`}>
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={() => setOverrideModalVisible(false)}
              style={tw`flex-1 border border-gray-200 dark:border-slate-600 py-3 rounded-xl items-center`}
            >
              <Text style={[tw`text-[13px] text-slate-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={confirmManualMode}
              style={tw`flex-1 bg-orange-500 py-3 rounded-xl items-center justify-center flex-row gap-1`}
            >
              <MaterialCommunityIcons name="tune-variant" size={14} color="white" />
              <Text style={[tw`text-[13px] text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </View>
      </BlurView>
    )}
    </>
  );
}
