const fs = require('fs');
const files = [
  'src/screens/ControlsScreen.tsx',
  'src/screens/ManageCropScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/YieldScreen.tsx',
  'src/screens/staff/ActivityLogScreen.tsx',
  'src/screens/staff/StaffCropScreen.tsx',
  'src/screens/staff/StaffProfileScreen.tsx',
  'src/screens/staff/StaffYieldScreen.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // 1. Fix the broken useNavigation line
  content = content.replace(/useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>\(\)/g, "useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>()");

  // 2. Fix the double >> on the SafeAreaView line
  content = content.replace(/<SafeAreaView edges=\{\['top'\]\} (style=\{tw`flex-1[^`]*`\})>>/g, "<SafeAreaView edges={['top']} $1>");

  fs.writeFileSync(f, content);
  console.log('Fixed', f);
});
