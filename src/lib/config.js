// Kiosk-only options (not business rules).
// Fines, loan period etc. are NOT here - they come from the library_settings table.
export const DEVICE_ID = import.meta.env.VITE_KIOSK_DEVICE_ID || 'KIOSK-01'
export const INACTIVITY_SECONDS = Number(import.meta.env.VITE_KIOSK_TIMEOUT_SECONDS) || 90
export const WARNING_SECONDS = 15
