# Smart Library System

React + Vite + Supabase (PostgreSQL, Auth, Realtime) + ESP32 RFID.
Uses your existing 8 tables. **No table is created, changed or removed.**

## 1. Install and run

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# open .env and paste your Supabase URL + publishable key
npm run dev
```
Open http://localhost:5173

## 2. Supabase setup (once)

1. **SQL Editor -> New query**, paste all of `supabase/setup.sql`, **Run**.
   It adds Row Level Security policies, the kiosk/return functions, a default settings row
   (only if empty) and Realtime entries. Safe to run again.
2. **Create the first admin**
   - Authentication -> Users -> **Add user** (email + password, tick "Auto confirm").
   - Table Editor -> `admins` -> insert a row with **the same email** and a name.
3. Add some data in the admin panel (`/admin/login`): books -> book copies -> students (with RFID UID).

## 3. Try it without hardware

While running `npm run dev`, the kiosk home page shows a dashed **"Dev only"** box.
Type a student's `rfid_uid` and press **Simulate tap**. It runs the same code as a real card.
This box is not included in the production build (`npm run build`).

## 4. How the pieces work

| Part | How |
|------|-----|
| Student identification | ESP32 -> Realtime **broadcast** channel `library-rfid` -> kiosk -> `kiosk_identify(rfid)` |
| Borrowing | `kiosk_borrow()` checks copy, availability, unpaid fines, settings; writes borrowings, copy status and activity **in one transaction** |
| Returns + fines | Admin presses Return -> `admin_return_book()`; fine = late days x `fine_per_day`, capped at `maximum_fine` (all from `library_settings`) |
| Admin security | Supabase Auth email/password + RLS: only emails listed in `admins` can touch admin data |
| Realtime | Dashboard, Activity, Borrowings, Fines, Book copies and student book search refresh automatically |
| Session safety | "Finish" button + inactivity timer (90 s, set `VITE_KIOSK_TIMEOUT_SECONDS`); student data is cleared on logout and on each new tap |

No secret key is in the frontend. The ESP32 only uses the publishable key.

## 5. Connect the real ESP32 (Phase 14)

1. Open `docs/esp32/smart_library_rfid.ino` in Arduino IDE, fill in Wi-Fi + Supabase URL/key, upload.
2. Tap a card, read its UID in the Serial Monitor (e.g. `A1B2C3D4`).
3. In the admin panel -> Students, save that exact value as the student's **RFID UID**.
4. Tap again: the kiosk opens the student's dashboard.

Test without the ESP32 (replace URL and KEY):
```bash
curl -X POST "https://YOUR-PROJECT-ID.supabase.co/realtime/v1/api/broadcast" \
  -H "apikey: YOUR-PUBLISHABLE-KEY" \
  -H "Authorization: Bearer YOUR-PUBLISHABLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"topic":"library-rfid","event":"scan","payload":{"rfid_uid":"A1B2C3D4"},"private":false}]}'
```

## 6. Known limitations (mention in your report)

- The broadcast channel is public: anyone who has the publishable key could send a fake UID.
  A UID alone does not give admin access, but it could open a student's session. Mitigations:
  keep the kiosk in a supervised place, and for production add a PIN or a shared device secret.
- Fines are created when a book is **returned late**. Books still out and overdue show as Overdue
  but have no fine until returned.
- The kiosk's RPC functions treat the RFID UID as the credential. This follows your design
  (RFID is the identification method, no student passwords).

## 7. Common errors

| Problem | Fix |
|---|---|
| Blank page / "Failed to fetch" | `.env` missing or wrong; restart `npm run dev` after editing it |
| Admin login says "not registered" | The auth user's email must also exist in the `admins` table |
| Kiosk says "Student not found" | The `rfid_uid` in `students` must match exactly what the reader sent |
| `function ... does not exist` | `supabase/setup.sql` was not run |
| Admin pages empty / permission error | Same as above (RLS policies come from setup.sql) |
| Dashboard does not update live | Re-run setup.sql (Realtime section) or enable Realtime for the tables |
