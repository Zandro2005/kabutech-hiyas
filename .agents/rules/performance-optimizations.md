# React Native Performance Optimizations

When adding new features, screens, or components to the Kabutech app, you MUST adhere to the following performance optimization standards to ensure the app remains fast, battery-efficient, and scalable. These rules are non-negotiable.

## 1. Granular Context Usage
- **DO NOT** use a single monolithic context provider for all data.
- **DO** use the split, granular hooks (e.g., `useSensors()`, `useStaffTasks()`, `useActivityLogs()`, `useSettings()`) defined in `src/hooks/useFirebaseData.ts`.
- Components should only subscribe to the specific data slice they actually render. This prevents global re-renders when unrelated background data (like sensor telemetry) updates.

## 2. List Virtualization
- **DO NOT** use `<ScrollView>` for rendering arrays of data or dynamic lists (e.g., lists of logs, racks, users, tasks).
- **DO** use `<FlatList>` or `<SectionList>` for any list that can grow dynamically.
- Always ensure the `keyExtractor` explicitly returns a `string` (e.g., `keyExtractor={(item) => String(item.id)}`).

## 3. Memoization of Heavy UI Components
- **DO** wrap complex, frequently updated, or visually expensive UI components in `React.memo()`. 
- Existing examples include charts (`YieldChart`), grids (`EnvironmentMetricsGrid`), headers (`ScreenHeader`), and complex list items.
- Always verify that props passed to memoized components (especially functions and objects) are wrapped in `useCallback` or `useMemo` in the parent component to prevent breaking the memoization cache.

## 4. UI Transition Deferral
- When navigating to complex screens or toggling heavy UI states (like Dark Mode), defer the heavy rendering until after the interaction or animation completes.
- Leverage an `isReady` state with `setTimeout` or `InteractionManager.runAfterInteractions` to let the UI thread quickly display a loading spinner first. This ensures silky smooth transitions and tab switching without UI lockups.
