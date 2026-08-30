# Accessibility (A11y) Standards

1. **Touch Targets:** Any `TouchableOpacity` or `Pressable` must have a `hitSlop` of at least `{ top: 10, bottom: 10, left: 10, right: 10 }` if the visual element is smaller than 44x44 points.
2. **Accessible Labels:** Critical icon-only buttons MUST include an `accessibilityLabel` explaining the action (e.g. `accessibilityLabel="Close Modal"`).
3. **Contrast:** Never place light gray text on a white background. Minimum contrast ratio guidelines should be respected in both light and dark modes.
