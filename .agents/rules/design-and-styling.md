# Design and Aesthetics Rules

To ensure Kabutech remains visually stunning and highly engaging, all AI agents MUST adhere to these UI/UX design standards:

## 1. Modern & Premium UI
- **CRITICAL:** The app must look premium, modern, and state-of-the-art. 
- Avoid generic web-safe colors (e.g., plain red `#FF0000`, blue `#0000FF`). Use curated, harmonious color palettes (e.g., Tailwind's `emerald`, `slate`, `amber`).
- Utilize subtle borders, generous padding, rounded corners (e.g., `rounded-[20px]`), and soft shadows (`shadow-sm`) to create depth.

## 2. Typography Consistency
- Use the custom `PlusJakartaSans` font family defined in the project. 
- Ensure proper font weights are explicitly set in the style arrays since React Native doesn't always cascade font families perfectly. 
  - Example: `style={[tw\`text-lg\`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}`

## 3. Dark Mode Support
- All new components MUST fully support Dark Mode. No exceptions.
- Always use the `dark:` prefix in Tailwind classes alongside light mode classes (e.g., `bg-white dark:bg-slate-900`).
- Test contrasting colors to ensure text readability and visual hierarchy in both themes.

## 4. Interactive & Haptic Feedback
- All buttons and touchable elements must use `TouchableOpacity` or `Pressable`.
- Provide visual feedback for loading states (spinners, skeletons) rather than freezing the UI or leaving blank screens.
- Use haptic feedback (from `src/utils/haptics.ts`) for important user interactions (e.g., button presses, toggles, success actions, errors) to make the app feel alive and responsive.
