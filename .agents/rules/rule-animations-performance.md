# Animation Performance Rules

1. **Native Driver:** When using the React Native `Animated` API, you MUST set `useNativeDriver: true` for any properties that support it (opacity, transform). Do NOT animate width, height, or margins with the Animated API as they block the JS thread.
2. **LayoutAnimation:** Use `LayoutAnimation.configureNext` sparingly, and ensure it doesn't cause massive screen reflows across unrelated components.
3. **JS Thread Blocks:** Do not perform heavy synchronous mathematical calculations or massive data parsing while an animation is currently running.
