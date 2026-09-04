export type AuthStackParamList = {
  Boot: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Main: { screen?: keyof MainTabParamList; params?: any } | undefined;
  StaffMain: { screen?: keyof StaffTabParamList; params?: any } | undefined;
  DeviceSchedules: undefined;
  Report: undefined;
  PendingApproval: undefined;
  StaffReportsInbox: undefined;
  StaffApprovals: undefined;
  AssignTask: undefined;
  MyActivityHistory: undefined;
  MyTasks: undefined;
  Analytics: { metric?: 'temp' | 'hum' | 'light' | 'co2'; tab?: 'temp' | 'hum' | 'light' | 'co2' } | undefined;
  LiveFarm: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Controls: { tab?: 'temp' | 'hum' | 'light' | 'co2' } | undefined;
  AddAction: undefined;
  ManageCrop: undefined;
  Yield: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  LiveFarm: undefined;
  Analytics: { metric?: 'temp' | 'hum' | 'light' | 'co2'; tab?: 'temp' | 'hum' | 'light' | 'co2' } | undefined;
};

export type StaffTabParamList = {
  Home: undefined;
  Crop: undefined;
  ActivityLog: undefined;
  Yield: undefined;
  Profile: undefined;
};

// A combined type for `useNavigation` that includes Root and Tab param lists
export type GlobalNavigationParamList = RootStackParamList & MainTabParamList & StaffTabParamList & AuthStackParamList & HomeStackParamList;
