# Input & Data Validation

1. **Client-side Guards:** Before pushing any data to Firebase, you MUST validate all inputs (e.g., check that crop yields are `> 0`, string fields are not `.trim() === ''`).
2. **Sanitization:** Ensure strings pushed to the DB are trimmed of leading and trailing whitespace.
3. **Type Safety:** If the data model expects a Number, explicitly cast inputs (`Number(val)`) instead of relying on loose JavaScript coercion before saving.
