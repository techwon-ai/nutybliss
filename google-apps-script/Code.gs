// Paste into Extensions > Apps Script of the NUTYBLISS Data spreadsheet.
// Then: Project Settings > Script Properties > add SHEETS_SECRET (same value as on your server).
// Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.

var HEADERS = {
  Orders: ['Order ID', 'Placed At', 'Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Items', 'Subtotal', 'Shipping', 'Total', 'Status'],
  Contact: ['ID', 'Received At', 'Name', 'Email', 'Subject', 'Message'],
  Newsletter: ['Email', 'Subscribed At'],
  Reviews: ['ID', 'Date', 'Name', 'Role', 'Stars', 'Product', 'Review', 'Moderation']
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET');
    if (!secret || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });
    if (!HEADERS[body.type] || !Array.isArray(body.row)) return reply({ ok: false, error: 'bad request' });

    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(body.type);
    if (!sheet) {
      sheet = ss.insertSheet(body.type);
      sheet.appendRow(HEADERS[body.type]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS[body.type].length).setFontWeight('bold');
    }
    // Prefix values starting with = + - @ so customer input can't run as a formula.
    var row = body.row.map(function (v) {
      return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
    });
    sheet.appendRow(row);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
