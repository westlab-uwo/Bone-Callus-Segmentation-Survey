/*
  Code.gs
  -------
  Paste this into the Apps Script editor of a Google Sheet (Extensions ->
  Apps Script), then deploy it as a Web App. Full steps in SETUP.md.

  Writes one response row per participant to the "Responses" sheet --
  this "long" format is the easiest to pivot/analyze later.
*/

function asString(value) {
  return Array.isArray(value) ? value.join("; ") : (value || "");
}

function doPost(e) {

  Logger.log("POST RECEIVED");

  if (!e || !e.postData) {
    Logger.log("NO DATA RECEIVED");
    return jsonResponse({
      ok:false,
      error:"No POST data"
    });
  }

  Logger.log(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const { participantSheet, responseSheet } = getOrCreateSheets();
    const responseId = Utilities.getUuid();
    const timestamp = payload.submitted_at || new Date().toISOString();
    const anonymousId = payload.anonymous_id || Utilities.getUuid();  //Even if the frontend fails to send the ID, the response is still tracked safely.
    Logger.log("Anonymous ID: " + anonymousId);
    deletePreviousResponses(responseSheet, anonymousId);

    addParticipant(
      participantSheet,
      payload.name || "",
      payload.affiliation || "",
      String(payload.email || "").trim().toLowerCase()
    );

    (payload.responses || []).forEach(resp => {
      const ranking = resp.ranking || [];

      responseSheet.appendRow([
        timestamp,
        responseId,
        anonymousId,
        asString(payload.role),
        asString(payload.practice_type),
        asString(payload.qualification),
        asString(payload.fellowship_completed),
        asString(payload.fellowship_subspecialty),
        asString(payload.years_practice),
        resp.image_id,
        ...padTo(ranking, 7)
      ]);
    });

    return jsonResponse({ ok: true, response_id: responseId });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function deletePreviousResponses(sheet, anonymousId) {
  if (!anonymousId) return;

  const data = sheet.getDataRange().getValues();

  // Column C = anonymous_id
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === anonymousId) {
      sheet.deleteRow(i + 1);
    }
  }
}

function padTo(arr, n) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

const SPREADSHEET_ID = "14iL4RnGAo9rN1mslVU-U3GpUSORLtpP93CM4eovX6L4";

const PARTICIPANTS = "Participants";
const RESPONSES = "Responses";

function getOrCreateSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const participantHeaders = [
    "name",
    "affiliation",
    "email"
  ];

  const responseHeaders = [
    "timestamp",
    "response_id",
    "anonymous_id",
    "role",
    "practice_type",
    "qualification",
    "fellowship_completed",
    "fellowship_subspecialty",
    "years_practice",
    "image_id",
    "rank_1_best",
    "rank_2",
    "rank_3",
    "rank_4",
    "rank_5",
    "rank_6",
    "rank_7_worst"
  ];

  // Participants sheet
  let participantSheet = ss.getSheetByName(PARTICIPANTS);

  if (!participantSheet) {
    participantSheet = ss.insertSheet(PARTICIPANTS);
  }

  // Add headers if sheet is empty
  if (participantSheet.getLastRow() < 1) {
    participantSheet
      .getRange(1, 1, 1, participantHeaders.length)
      .setValues([participantHeaders]);
    participantSheet.setFrozenRows(1);
  }

  // Responses sheet
  let responseSheet = ss.getSheetByName(RESPONSES);

  if (!responseSheet) {
    responseSheet = ss.insertSheet(RESPONSES);
  }

  // Add headers if sheet is empty
  if (responseSheet.getLastRow() < 1) {
    responseSheet
      .getRange(1, 1, 1, responseHeaders.length)
      .setValues([responseHeaders]);
    responseSheet.setFrozenRows(1);
  }

  return {
    participantSheet,
    responseSheet
  };
}

function addParticipant(participantSheet, name, affiliation, email) {

  email = normalizeEmail(email);

  const lastRow = participantSheet.getLastRow();

  if (lastRow > 1) {

    const emails = participantSheet
      .getRange(2, 3, lastRow - 1, 1)
      .getValues();

    for (let i = 0; i < emails.length; i++) {

      const existingEmail = normalizeEmail(emails[i][0]);

      if (existingEmail === email) {

        return;   // <-- do not update Sheet 1
      }
    }
  }

  Logger.log("NO MATCH. Adding new participant.");

  participantSheet.appendRow([
    name,
    affiliation,
    email
  ]);
}


function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({ ok: true, msg: "Bone & Callus survey endpoint is live." });
}
