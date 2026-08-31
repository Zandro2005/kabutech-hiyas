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
import { useStaffTasks } from '../hooks/useFirebaseData';
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

const DummyScreen = () => null;

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function StaffHomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={StaffHomeScreen} />
      <HomeStack.Screen name="LiveFarm" component={LiveFarmScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
    </HomeStack.Navigator>
  );
}

export default function StaffTabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const allTasks = useStaffTasks();
  const insets = useSafeAreaInsets();
  const pendingTasks = allTasks.filter(t => t.assignedTo === user?.uid && t.status === 'assigned').length;

  return (
    <Tab.Navigator
      screenListeners={{ tabPress: () => hapticLight() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDarkMode ? '#6ee7b7' : (tw.color('brand-deep') || '#032514'),
        tabBarInactiveTintColor: isDarkMode ? '#64748b' : '#94a3b8',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
          fontFamily: 'PlusJakartaSans_700Bold',
        },
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderTopWidth: 0,
          height: (Platform.OS === 'ios' ? 85 : 90) + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
          paddingHorizontal: 8,
          paddingTop: 8,
          elevation: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={StaffHomeStackNavigator} 
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={28} color={color} /> }}
      />
      <Tab.Screen 
        name="Crop" 
        component={StaffCropScreen} 
        options={{ tabBarLabel: 'Crop', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="leaf" size={28} color={color} /> }}
      />
      <Tab.Screen 
        name="ActivityLog" 
        component={DummyScreen} 
        listeners={{
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('ActivityLog' as never); // Will map to a screen in StaffMain stack or tab
          }
        }}
        options={{ 
          tabBarLabel: 'Activity Log',
          tabBarIcon: () => <View style={{ width: 24, height: 24 }} />, // Empty space for FAB
          tabBarButton: (props) => (
            <View {...(props as any)} style={[props.style, { opacity: 1 }]} pointerEvents="box-none">
              <View style={tw`absolute -top-8 items-center w-full`}>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                  onPress={() => navigation.navigate('ActivityLog' as never)} // NOTE: This needs to map correctly
                  style={[
                    tw`w-[58px] h-[58px] bg-[#166534] dark:bg-emerald-600 rounded-full items-center justify-center shadow-lg`,
                    { borderWidth: 4, borderColor: isDarkMode ? '#0f172a' : '#ffffff' }
                  ]}
                >
                  <MaterialCommunityIcons name="clipboard-text-outline" size={32} color="white" />
                </TouchableOpacity>
              </View>
              {props.children}
            </View>
          )
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={MyTasksScreen} 
        options={{ 
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-check-outline" size={28} color={color} />,
          tabBarBadge: pendingTasks > 0 ? pendingTasks : undefined,
          tabBarBadgeStyle: { 
            backgroundColor: '#ef4444', 
            color: 'white', 
            fontSize: 9,
            minWidth: 16,
            height: 16,
            lineHeight: 16,
            borderRadius: 8,
            marginTop: -2,
            marginLeft: 4,
            fontWeight: 'bold'
          }
        }}
      />
      <Tab.Screen 
        name="Yield" 
        component={StaffYieldScreen} 
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-bar" size={28} color={color} /> }}
      />
      <Tab.Screen 
        name="Profile" 
        component={StaffProfileScreen} 
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}
