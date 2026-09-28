/*
 * Code.gs
 * -------
 * Google Apps Script backend for the Bone & Callus survey.
 *
 * IDENTITY MODEL
 * --------------
 *
 * anonymous_id is the PRIMARY identity.
 *
 * The frontend should generate one anonymous_id for each
 * browser tab / survey session.
 *
 * Therefore:
 *
 * - New browser tab = new anonymous_id = new doctor
 * - Refreshing the same tab = same anonymous_id = same doctor
 * - Continuing the survey in the same tab = same doctor
 * - A different browser = new anonymous_id = new doctor
 * - Two doctors can use the same computer
 *   if they use separate browser tabs.
 *
 *
 * Participants sheet:
 * - One row per anonymous_id.
 * - Same anonymous_id = same participant/session.
 * - Same name = keep one copy.
 * - Different name = append the new version.
 * - Same affiliation = keep one copy.
 * - Different affiliation = append the new version.
 * - Same email = keep one copy.
 * - Different email = append the new email.
 *
 *
 * Responses sheet:
 * - Stores one row per image response.
 * - Previous responses with the same anonymous_id
 *   are removed before the new responses are written.
 *
 *
 * Participants columns:
 * A = anonymous_id
 * B = name
 * C = affiliation
 * D = email
 *
 *
 * Responses columns:
 * A = timestamp
 * B = response_id
 * C = anonymous_id
 * D = role
 * E = practice_type
 * F = qualification
 * G = fellowship_completed
 * H = fellowship_subspecialty
 * I = years_practice
 * J = image_id
 * K = rank_1_best
 * L = rank_2
 * M = rank_3
 * N = rank_4
 * O = rank_5
 * P = rank_6
 * Q = rank_7_worst
 */

// ========================= CONFIGURATION =========================

const SPREADSHEET_ID =
  "1zC207uLwmPvuWPZCZfDMtn3ZQw_BzRSXhtE2Y3U6w9w";

const PARTICIPANTS = "Participants";
const RESPONSES = "Responses";


// ========================= WEB APP =========================

function doPost(e) {

  Logger.log("POST RECEIVED");

  if (!e || !e.postData) {

    Logger.log("NO DATA RECEIVED");

    return jsonResponse({
      ok: false,
      error: "No POST data",
    });

  }

  Logger.log(e.postData.contents);

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const payload =
      JSON.parse(
        e.postData.contents
      );

    const {
      participantSheet,
      responseSheet
    } = getOrCreateSheets();

    const responseId =
      Utilities.getUuid();

    const timestamp =
      payload.submitted_at ||
      new Date().toISOString();


    /*
     * anonymous_id is the PRIMARY identity.
     *
     * The frontend should create a new anonymous_id
     * whenever a NEW browser tab is opened.
     *
     * If the frontend does not provide one,
     * generate a fallback ID.
     */
    const anonymousId =
      String(
        payload.anonymous_id || ""
      ).trim() ||
      Utilities.getUuid();


    Logger.log(
      "Anonymous ID: " +
        anonymousId
    );


    /*
     * Remove all previous responses belonging
     * to this anonymous_id.
     *
     * This means:
     *
     * Same tab / same anonymous_id
     *     -> previous responses replaced
     *
     * New tab / new anonymous_id
     *     -> previous doctor's responses untouched
     */
    deletePreviousResponses(
      responseSheet,
      anonymousId
    );


    /*
     * Add or update participant information.
     *
     * anonymous_id determines whether this is
     * an existing participant/session.
     */
    addParticipant(
      participantSheet,
      anonymousId,
      payload.name || "",
      payload.affiliation || "",
      payload.email || ""
    );


    /*
     * Add image-ranking responses.
     */
    (payload.responses || [])
      .forEach(function (resp) {

        const ranking =
          resp.ranking || [];

        responseSheet.appendRow([

          timestamp,

          responseId,

          anonymousId,

          asString(
            payload.role
          ),

          asString(
            payload.practice_type
          ),

          asString(
            payload.qualification
          ),

          asString(
            payload.fellowship_completed
          ),

          asString(
            payload.fellowship_subspecialty
          ),

          asString(
            payload.years_practice
          ),

          resp.image_id || "",

          ...padTo(
            ranking,
            7
          ),

        ]);

      });


    return jsonResponse({

      ok: true,

      response_id:
        responseId,

      anonymous_id:
        anonymousId,

    });


  } catch (err) {

    Logger.log(
      "ERROR: " +
        err
    );

    return jsonResponse({

      ok: false,

      error:
        String(err),

    });


  } finally {

    lock.releaseLock();

  }
}


// ========================= GET =========================

function doGet() {

  return jsonResponse({

    ok: true,

    msg:
      "Bone & Callus survey endpoint is live.",

  });

}


// ========================= SHEET SETUP =========================

function getOrCreateSheets() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  /*
   * Participants sheet.
   *
   * There is NO duplicate_person column.
   */
  const participantHeaders = [

    "anonymous_id",

    "name",

    "affiliation",

    "email",

  ];


  /*
   * Responses sheet.
   */
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

    "rank_7_worst",

  ];


  /*
   * Get or create Participants sheet.
   */
  let participantSheet =
    ss.getSheetByName(
      PARTICIPANTS
    );


  if (!participantSheet) {

    participantSheet =
      ss.insertSheet(
        PARTICIPANTS
      );

  }


  /*
   * Set Participants headers.
   */
  participantSheet
    .getRange(
      1,
      1,
      1,
      participantHeaders.length
    )
    .setValues([
      participantHeaders
    ]);

  participantSheet.setFrozenRows(1);


  /*
   * Get or create Responses sheet.
   */
  let responseSheet =
    ss.getSheetByName(
      RESPONSES
    );


  if (!responseSheet) {

    responseSheet =
      ss.insertSheet(
        RESPONSES
      );

  }


  /*
   * Set Responses headers.
   */
  responseSheet
    .getRange(
      1,
      1,
      1,
      responseHeaders.length
    )
    .setValues([
      responseHeaders
    ]);

  responseSheet.setFrozenRows(1);


  return {

    participantSheet:
      participantSheet,

    responseSheet:
      responseSheet,

  };

}


// ========================= PARTICIPANT HANDLING =========================

function addParticipant(
  participantSheet,
  anonymousId,
  name,
  affiliation,
  email
) {

  const normalizedAnonymousId =
    String(
      anonymousId || ""
    ).trim();


  const cleanName =
    String(
      name || ""
    ).trim();


  const cleanAffiliation =
    String(
      affiliation || ""
    ).trim();


  const normalizedEmail =
    normalizeEmail(
      email
    );


  const lastRow =
    participantSheet.getLastRow();


  /*
   * No participants yet.
   *
   * Add the first participant.
   */
  if (lastRow <= 1) {

    Logger.log(
      "No existing participants. " +
      "Adding new participant."
    );


    participantSheet.appendRow([

      normalizedAnonymousId,

      cleanName,

      cleanAffiliation,

      normalizedEmail,

    ]);


    return;

  }


  /*
   * Participants columns:
   *
   * A = anonymous_id
   * B = name
   * C = affiliation
   * D = email
   */
  const participants =
    participantSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        4
      )
      .getValues();


  /*
   * Look for the same anonymous_id.
   *
   * This is the ONLY identity check.
   */
  for (
    let i = 0;
    i < participants.length;
    i++
  ) {

    const existingAnonymousId =
      String(
        participants[i][0] || ""
      ).trim();


    if (
      existingAnonymousId ===
      normalizedAnonymousId
    ) {

      const rowNumber =
        i + 2;


      Logger.log(
        "Existing participant/session found: " +
          normalizedAnonymousId
      );


      /*
       * NAME
       *
       * Same name:
       *     keep one copy.
       *
       * Different spelling/name:
       *     append the new version.
       */
      appendUniqueValue(

        participantSheet,

        rowNumber,

        2,

        cleanName,

        normalizeText

      );


      /*
       * AFFILIATION
       *
       * Same affiliation:
       *     keep one copy.
       *
       * Different spelling/affiliation:
       *     append the new version.
       */
      appendUniqueValue(

        participantSheet,

        rowNumber,

        3,

        cleanAffiliation,

        normalizeText

      );


      /*
       * EMAIL
       *
       * Same email:
       *     keep one copy.
       *
       * Different email:
       *     append the new email.
       */
      appendUniqueValue(

        participantSheet,

        rowNumber,

        4,

        normalizedEmail,

        normalizeEmail

      );


      return;

    }

  }


  /*
   * No matching anonymous_id was found.
   *
   * Therefore this is a NEW participant/session.
   */
  Logger.log(
    "New anonymous_id. " +
    "Adding new participant."
  );


  participantSheet.appendRow([

    normalizedAnonymousId,

    cleanName,

    cleanAffiliation,

    normalizedEmail,

  ]);

}


// ========================= UNIQUE VALUE HANDLING =========================

function appendUniqueValue(
  sheet,
  rowNumber,
  columnNumber,
  newValue,
  normalizer
) {

  newValue =
    String(
      newValue || ""
    ).trim();


  /*
   * Don't add blank values.
   */
  if (!newValue) {

    return;

  }


  const cell =
    sheet.getRange(
      rowNumber,
      columnNumber
    );


  const existingValue =
    String(
      cell.getValue() || ""
    ).trim();


  /*
   * Nothing currently stored.
   */
  if (!existingValue) {

    cell.setValue(
      newValue
    );

    return;

  }


  /*
   * Existing values are separated
   * by semicolons.
   */
  const existingValues =
    existingValue
      .split(";")
      .map(function (value) {

        return value.trim();

      })
      .filter(function (value) {

        return value !== "";

      });


  /*
   * Normalize the new value only
   * for comparison.
   */
  const normalizedNewValue =
    normalizer(
      newValue
    );


  /*
   * Check whether the value already exists.
   */
  const alreadyExists =
    existingValues.some(
      function (existingValue) {

        return (
          normalizer(
            existingValue
          ) ===
          normalizedNewValue
        );

      }
    );


  /*
   * Same value already exists.
   */
  if (alreadyExists) {

    Logger.log(
      "Value already exists: " +
        newValue
    );

    return;

  }


  /*
   * Different value.
   *
   * Append it while preserving
   * the original spelling.
   */
  existingValues.push(
    newValue
  );


  cell.setValue(
    existingValues.join(
      "; "
    )
  );


  Logger.log(
    "New value appended: " +
      newValue
  );

}


// ========================= RESPONSE HANDLING =========================

function deletePreviousResponses(
  sheet,
  anonymousId
) {

  if (!anonymousId) {

    return;

  }


  const data =
    sheet
      .getDataRange()
      .getValues();


  /*
   * Responses sheet:
   *
   * Column C = anonymous_id.
   *
   * Delete backwards because rows
   * are being removed.
   */
  for (
    let i = data.length - 1;
    i >= 1;
    i--
  ) {

    if (
      String(
        data[i][2]
      ) ===
      String(
        anonymousId
      )
    ) {

      sheet.deleteRow(
        i + 1
      );

    }

  }

}


// ========================= HELPER FUNCTIONS =========================

function asString(value) {

  return Array.isArray(value)

    ? value.join("; ")

    : value || "";

}


function padTo(
  arr,
  n
) {

  const out =
    arr.slice(
      0,
      n
    );


  while (
    out.length < n
  ) {

    out.push("");

  }


  return out;

}


function normalizeEmail(
  email
) {

  return String(
    email || ""
  )
    .trim()
    .replace(
      /\s+/g,
      ""
    )
    .toLowerCase();

}


function normalizeText(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .toLowerCase();

}


function jsonResponse(
  obj
) {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        obj
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
