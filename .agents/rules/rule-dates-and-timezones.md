# Dates and Timezones

1. **ISO Strings:** All dates saved to Firebase MUST be converted to an ISO string (`new Date().toISOString()`) or stored as a Unix timestamp (milliseconds). Do NOT store locale-specific date strings in the DB.
2. **Displaying Dates:** When displaying dates to the user, always format them cleanly (e.g., `Oct 14, 2026`) and handle invalid date parsing gracefully (fallback to 'Unknown Date' rather than rendering 'NaN/NaN/NaN').
3. **Consistency:** Use the native `Date` object consistently. Do not invent custom regex date parsing logic for standard formats.
