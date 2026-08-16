# Supabase cloud setup

1. Create a free Supabase project.
2. Open SQL Editor and run `setup.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in the project URL and anon key from Project Settings > API.
5. Replace `VITE_COUPLE_ID` with a long random private value.

The app keeps an IndexedDB copy and a localStorage mirror on every device.
Supabase stores the current shared state and creates one server-side backup per day
before an update. Backup rows are only accessible from the Supabase dashboard.
