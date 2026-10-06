import { supabase } from './supabase'

/*
  RFID SERVICE
  ------------
  The ESP32 reads the card and sends the UID to a Supabase Realtime BROADCAST
  channel (plain HTTPS POST, using only the publishable key - no secret keys).
  The React kiosk listens to the same channel.

    ESP32 --HTTPS POST--> Supabase Realtime --broadcast--> React kiosk

  Nothing is stored in the database and no extra table is needed.
  The same message format can be sent by curl for testing (see README.md).
*/

export const RFID_CHANNEL = 'library-rfid'
export const RFID_EVENT = 'scan'

// Starts listening. Returns a function that stops listening.
export function subscribeToRfid(onScan) {
  const channel = supabase
    .channel(RFID_CHANNEL)
    .on('broadcast', { event: RFID_EVENT }, ({ payload }) => {
      const uid = String(payload?.rfid_uid ?? '').trim()
      if (uid) onScan(uid, payload?.device_id)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
