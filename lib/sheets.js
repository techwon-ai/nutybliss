// Sends rows to a Google Sheet through an Apps Script web app.
// Set SHEETS_WEBHOOK_URL and SHEETS_SECRET in the host's environment.
// If they are missing, logging is skipped and the site keeps working.

const URL = process.env.SHEETS_WEBHOOK_URL;
const SECRET = process.env.SHEETS_SECRET;

async function logToSheet(type, row) {
  if (!URL || !SECRET) return;
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: SECRET, type, row }),
      redirect: 'follow'
    });
    const text = await res.text();
    if (!text.includes('"ok":true')) console.error(`[sheets] ${type} not saved:`, text.slice(0, 200));
  } catch (err) {
    console.error(`[sheets] ${type} failed:`, err.message);
  }
}

module.exports = { logToSheet };
