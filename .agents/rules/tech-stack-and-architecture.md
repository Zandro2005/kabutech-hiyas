# Tech Stack & Architecture Rules

When working on the Kabutech codebase, AI agents MUST follow these architectural and technical constraints:

## 1. Firebase Realtime Database
- **CRITICAL:** This project uses **Firebase Realtime Database** (`firebase/database`), NOT Firestore (`firebase/firestore`). 
- Do not import or use Firestore methods (e.g., `collection`, `doc`, `getDocs`). 
- Only use Realtime DB methods (e.g., `ref`, `get`, `onValue`, `update`, `set`, `push`) and structure queries appropriately.

## 2. Tailwind CSS (twrnc)
- The project uses `twrnc` for styling. Always import it from the local setup: `import tw from '../tailwind'` (adjust path depth as needed).
- **DO NOT** use standard React Native `StyleSheet.create` unless absolutely necessary for animations or highly dynamic inline styles that Tailwind cannot handle.
- Stick to standard Tailwind utility classes.

## 3. Strict TypeScript
- Always define explicit `interface` or `type` definitions for component props, API payloads, and data models.
- **DO NOT** use `any`. If a type is temporarily unknown, use `unknown` and narrow it down, or properly define the shape of the object.

## 4. Folder Structure Integrity
- `src/screens/`: Full-page screen components.
- `src/components/`: Reusable UI elements (e.g., Modals, Charts, Cards). Do not put full screens here.
- `src/hooks/`: Custom React hooks, especially for Firebase data fetching.
- `src/context/`: React Context providers.
- `src/utils/`: Pure helper functions, constants, and data formatters.
