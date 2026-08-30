# Firebase Realtime Database Best Practices

1. **Granular Updates:** When updating a specific field in a Firebase object, use deep paths in the `update()` payload (e.g., `update(ref, { 'stats/health': 90 })`) rather than fetching the whole object, modifying it locally, and saving the whole object back. This prevents race conditions.
2. **Push vs Set:** Use `push(ref(db, '...'))` for creating new records in a list to ensure unique keys. Use `set()` only when you explicitly want to destructively overwrite a known node.
3. **Batched Updates:** If modifying multiple related nodes at once, build a single `update()` payload containing all paths and execute it once to ensure atomicity.
