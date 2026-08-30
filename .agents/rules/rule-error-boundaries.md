# Error Boundaries & Logging

1. **Graceful Failures:** If a component crashes, it should not take down the whole app. Heavy or experimental components should be wrapped in an Error Boundary or fail gracefully.
2. **Console Cleanliness:** Do not leave `console.log` statements inside rendering cycles (e.g., inside `map` functions or raw component bodies) as this degrades performance. Use them only inside event handlers or `useEffect` for debugging, and remove them before final implementation.
3. **Actionable Errors:** When throwing or alerting errors, explain *how* the user can fix it (e.g., "Check your internet connection" instead of just "Network Error").
