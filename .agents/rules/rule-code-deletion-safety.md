# Code Deletion & Refactoring Safety

1. **Don't Break External Dependencies:** Before removing a function or state variable, an AI agent MUST use global search to ensure it is not being imported and used by another component in a different folder.
2. **No Dead Code:** When refactoring, actively clean up unused imports and deprecated variables. Do not leave commented-out blocks of legacy code in the final artifact.
3. **Preserve Logic:** When modernizing a component (e.g., converting ScrollView to FlatList), you MUST preserve 100% of the original business logic, conditional rendering, and access controls. Do not strip features for the sake of optimization.
