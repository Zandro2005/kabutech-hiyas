export type AuthStackParamList = {
  Boot: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  StaffMain: undefined;
  DeviceSchedules: undefined;
  Report: undefined;
  PendingApproval: undefined;
  StaffReportsInbox: undefined;
  StaffApprovals: undefined;
  AssignTask: undefined;
  MyActivityHistory: undefined;
  MyTasks: undefined;
  Analytics: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Controls: undefined;
  AddAction: undefined;
  ManageCrop: undefined;
  Yield: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  LiveFarm: undefined;
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
