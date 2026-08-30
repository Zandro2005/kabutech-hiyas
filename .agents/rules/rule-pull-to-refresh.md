# Pull-to-Refresh & Loading States

1. **RefreshControl:** Any primary list (`FlatList` or `ScrollView`) containing dynamic remote data should ideally implement a `RefreshControl`.
2. **Visual Continuity:** When a user pulls to refresh, do not replace the entire list with a massive full-screen loading spinner. Keep the old list visible and rely on the native `RefreshControl` spinner at the top.
3. **Debounce:** Ensure the refresh function cannot be triggered concurrently 5 times a second if the user spams the pull gesture.
