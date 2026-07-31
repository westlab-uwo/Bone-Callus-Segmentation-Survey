/*
  Code.gs
  -------
  Paste this into the Apps Script editor of a Google Sheet (Extensions ->
  Apps Script), then deploy it as a Web App. Full steps in SETUP.md.

  Writes ONE ROW PER (expert response x case) to the "Responses" sheet --
  this "long" format is the easiest to pivot/analyze later.
*/

const SHEET_NAME = "Responses";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const responseId = Utilities.getUuid();
    const timestamp = payload.submitted_at || new Date().toISOString();

    const baseCols = [
      timestamp,
      responseId,
      payload.name || "",
      payload.affiliation || "",
      payload.email || "",
      payload.role || "",
      payload.practice_type || "",
      payload.qualification || "",
      payload.fellowship_completed || "",
      payload.fellowship_subspecialty || "",
      payload.years_practice || "",
    ];

    (payload.responses || []).forEach(resp => {
      const ranking = resp.ranking || [];
      const row = baseCols.concat([resp.image_id]).concat(padTo(ranking, 7));
      sheet.appendRow(row);
    });

    return jsonResponse({ ok: true, response_id: responseId });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function padTo(arr, n) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById("1Wr7opYWTKZGU6ZsIzqg-g6zxawd2OyijYIk-MxSi0dgIo");
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "timestamp", "response_id", "name", "affiliation", "email",
      "role", "practice_type", "qualification", "fellowship_completed",
      "fellowship_subspecialty", "years_practice", "image_id",
      "rank_1_best", "rank_2", "rank_3", "rank_4", "rank_5", "rank_6", "rank_7_worst",
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({ ok: true, msg: "Bone & Callus survey endpoint is live." });
}