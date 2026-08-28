export type AuthStackParamList = {
  Boot: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  DeviceSchedules: undefined;
  Report: undefined;
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

// A combined type for `useNavigation` that includes Root and Tab param lists
export type GlobalNavigationParamList = RootStackParamList & MainTabParamList & AuthStackParamList & HomeStackParamList;
