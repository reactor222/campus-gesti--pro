SETUP SUPABASE

1. Go to https://supabase.com
2. Create project
3. Open Project Settings -> API
4. Copy:
   - Project URL
   - anon public key

5. Open app.js
6. Replace:

PASTE_YOUR_SUPABASE_URL
PASTE_YOUR_SUPABASE_ANON_KEY

7. In Supabase create users from:
Authentication -> Users -> Add User

IMPORTANT:
Your current project still uses localStorage for most data.
You must later migrate users/courses/groups/events to Supabase tables.
