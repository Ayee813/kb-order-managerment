import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SHEET_ID,
} from "./constants.ts";

/**
 * Helper to encode string to base64url
 */
function b64(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Helper to encode ArrayBuffer to base64url
 */
function ab2b64(buf: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return b64(bin);
}

/**
 * Exchanges Service Account credentials for a Google OAuth2 Access Token.
 * Requires GOOGLE_PRIVATE_KEY to be set in environment variables.
 */
async function getAccessToken(): Promise<string> {
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("GOOGLE_PRIVATE_KEY environment variable is not set");
  }

  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope:
      "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "")
    .replace(/\s/g, "");

  // Convert base64 to binary
  const binaryKey = new Uint8Array(
    atob(pemContents).split("").map((c) => c.charCodeAt(0)),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );

  const jwt = `${header}.${payload}.${ab2b64(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(
      `Google Auth Error: ${data.error_description || data.error}`,
    );
  }
  return data.access_token;
}

/**
 * Fetches data from a specific range in the Google Sheet.
 */
export async function fetchSheetData(range = "A1:Z1000") {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Sheets API Error: ${data.error.message}`);
  return data.values || [];
}

/**
 * Appends a row of data to the Google Sheet.
 */
export async function appendSheetRow(values: string[][], range = "Sheet1!A1") {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Sheets API Error: ${data.error.message}`);
  return data;
}

/**
 * Updates a specific range in the Google Sheet.
 */
export async function updateSheetRow(range: string, values: string[][]) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Sheets API Error: ${data.error.message}`);
  return data;
}

/**
 * Deletes a row from the Google Sheet using batchUpdate.
 */
export async function deleteSheetRow(rowIndex: number) {
  const token = await getAccessToken();
  // Sheets API uses 0-based indices for deleteDimension.
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming first sheet
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Sheets API Error: ${data.error.message}`);
  return data;
}

/**
 * Fetches the latest row from the designated Google Sheet.
 */
export async function fetchLatestSheetData() {
  const values = await fetchSheetData("A1:Z500");
  if (!values || values.length === 0) return null;
  return values[values.length - 1]; // Return the last row
}

/**
 * Uploads a file to the designated Google Drive folder.
 */
export async function uploadToDrive(
  fileName: string,
  mimeType: string,
  body: Uint8Array,
) {
  const token = await getAccessToken();

  const metadata = {
    name: fileName,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartBody = delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: " + mimeType + "\r\n\r\n";

  const footer = close_delim;

  const combinedBody = new Uint8Array(
    new TextEncoder().encode(multipartBody).length +
      body.length +
      new TextEncoder().encode(footer).length,
  );

  let offset = 0;
  combinedBody.set(new TextEncoder().encode(multipartBody), offset);
  offset += new TextEncoder().encode(multipartBody).length;
  combinedBody.set(body, offset);
  offset += body.length;
  combinedBody.set(new TextEncoder().encode(footer), offset);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": 'multipart/related; boundary="' + boundary + '"',
      },
      body: combinedBody,
    },
  );

  const data = await res.json();
  if (data.error) throw new Error(`Drive API Error: ${data.error.message}`);
  return data;
}

/**
 * Sets a file to be publicly viewable by anyone with the link.
 */
export async function setFilePublic(fileId: string) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    },
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(`Drive Permissions Error: ${data.error.message}`);
  }
  return data;
}

/**
 * Uploads an image and returns a public webViewLink.
 */
export async function uploadImageToDrive(
  fileName: string,
  mimeType: string,
  body: Uint8Array,
) {
  const uploadResult = await uploadToDrive(fileName, mimeType, body);
  const fileId = uploadResult.id;
  await setFilePublic(fileId);

  // Return a direct view link if possible, or the webViewLink
  // The API returns basic info, we might need to fetch the full file metadata for the link
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const metadata = await res.json();
  return metadata.webViewLink || metadata.webContentLink;
}

/**
 * Wrapper function to fetch the latest sheet data and archive the print job.
 */
export async function getPrintDataAndArchive(printJobData: Uint8Array) {
  const latestRow = await fetchLatestSheetData();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uploadResult = await uploadToDrive(
    `print-job-${timestamp}.png`,
    "image/png",
    printJobData,
  );

  return {
    data: latestRow,
    archive: uploadResult,
  };
}
