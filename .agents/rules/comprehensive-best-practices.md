# Comprehensive Best Practices (Top 10 Advanced Rules)

The following 10 rules must be strictly adhered to by any AI agent modifying or expanding the Kabutech app:

## 1. Firebase Listener Cleanup (Memory Leaks)
- **CRITICAL:** Every time you attach a Firebase real-time listener (e.g., `onValue`, `onChildAdded`) inside a `useEffect`, you **MUST** return an unsubscribe function. 
- Failure to clean up listeners will result in massive memory leaks and duplicated background triggers.

## 2. State vs. Refs (Re-render Optimization)
- Do not blindly use `useState` for every variable. 
- If a value changes frequently but does not immediately affect what the user sees on the screen (e.g., a timer ID, a scroll position threshold, a temporary drag state), use `useRef` instead to completely avoid unnecessary UI re-renders.

## 3. Strict Error Handling & Fallbacks
- No silent failures. All asynchronous operations (especially Firebase read/writes) MUST be wrapped in `try/catch` blocks.
- If an operation fails, you must provide user-facing feedback (e.g., using a Custom Toast or Error Modal). Never leave the user wondering if a button press worked.

## 4. Navigation Type Safety
- React Navigation hooks (e.g., `useNavigation()`) MUST be strongly typed using `NativeStackNavigationProp` and the global `GlobalNavigationParamList`.
- Never bypass type checking with `as any` when navigating between screens, as this can lead to hard-to-track runtime crashes if route parameters change.

## 5. Offline-First Resilience
- Assume the user might lose their internet connection while inside a greenhouse or farm facility.
- Design UIs to fail gracefully. If Firebase data takes too long to load, show localized skeletons. Never let the app crash if a specific node returns `null` because of network latency.

## 6. Single Responsibility Principle (Component Modularity)
- If a screen component (`.tsx` file) exceeds 350-400 lines of code, it is too large. 
- You MUST extract complex pieces (like Modals, Custom Cards, or Charts) into their own files under `src/components/`. Keep the main screen clean and focused on layout and state orchestration.

## 7. Avoid the "Pyramid of Doom" (Async/Await)
- Do not use deeply nested `.then().catch()` chains for Firebase operations.
- Always use flat `async/await` syntax with early returns. This keeps the business logic readable and dramatically reduces indentation hell.

## 8. No Magic Numbers or Hardcoded Strings
- Avoid hardcoding arbitrary animation delays, timeout durations, or cryptic status strings directly inside JSX.
- Define them as clear constants at the top of the file (e.g., `const ANIMATION_DELAY_MS = 200;` or `const STATUS_HARVESTED = 'harvested';`).

## 9. Image and Asset Optimization
- Do not load massive images without specifying exact constraints. Use the `resizeMode` prop thoughtfully on the `<Image>` component to prevent memory spikes.
- For icons, always prioritize vector icons (`@expo/vector-icons`) over PNGs to keep the bundle size small and crisp on all displays.

## 10. Meaningful AI Commenting
- When you (the AI agent) write complex business logic, mathematical calculations (like the Health Score algorithm), or complex Firebase transactions, you **MUST** leave a brief inline comment explaining *why* it was done that way, not just *what* the code does. This helps future agents understand the context of the decision.
