# Clean Code Naming Conventions

1. **Booleans:** Boolean variables MUST be prefixed with `is`, `has`, `should`, or `can` (e.g., `isReady`, `hasError`, `canEdit`).
2. **Event Handlers:** Functions handling events MUST be prefixed with `handle` (e.g., `handlePressSubmit`, `handleCloseModal`). Props passing those events MUST be prefixed with `on` (e.g., `onSubmit`, `onClose`).
3. **Components:** React components MUST use PascalCase (`StaffCropScreen.tsx`). React Hooks MUST use camelCase prefixed with `use` (`useFirebaseData.ts`).
