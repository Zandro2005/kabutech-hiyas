# iOS vs Android Platform Quirks

1. **KeyboardAvoidingView:** Forms and text inputs on screens must be wrapped in a `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` to ensure inputs aren't blocked by the keyboard.
2. **Safe Areas:** Always use `useSafeAreaInsets()` from `react-native-safe-area-context` to calculate top padding instead of hardcoding `pt-10`. Devices have wildly different notch sizes.
3. **Shadows:** Tailwind shadow utilities (`shadow-sm`, etc.) work well on iOS but require `elevation` on Android. Ensure the UI design accounts for both platforms without clipping.
