const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
].join(" ");

let tokenClient = null;
let accessToken = null;

function initGoogleAuth(onToken) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPES,
    callback: (resp) => {
      if (resp.error) {
        onToken(null, resp);
        return;
      }
      accessToken = resp.access_token;
      onToken(accessToken, null);
    }
  });
}

function requestLogin() {
  tokenClient.requestAccessToken({ prompt: "" });
}

function requestLoginFresh() {
  tokenClient.requestAccessToken({ prompt: "consent" });
}

function signOut() {
  if (accessToken && google?.accounts?.oauth2?.revoke) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  clearLocalSettings();
}

async function fetchUserInfo() {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("userinfo failed");
  return res.json();
}

async function findSettingsFileId() {
  const url = "https://www.googleapis.com/drive/v3/files" +
    `?spaces=appDataFolder&q=name%3D%27${encodeURIComponent(CONFIG.DRIVE_SETTINGS_FILENAME)}%27` +
    "&fields=files(id,name)";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("drive list failed");
  const data = await res.json();
  return (data.files && data.files.length) ? data.files[0].id : null;
}

async function loadSettingsFromDrive() {
  const fileId = await findSettingsFileId();
  if (!fileId) return null;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("drive read failed");
  return res.json();
}

async function saveSettingsToDrive(settings) {
  const fileId = await findSettingsFileId();
  const metadata = fileId
    ? { name: CONFIG.DRIVE_SETTINGS_FILENAME }
    : { name: CONFIG.DRIVE_SETTINGS_FILENAME, parents: ["appDataFolder"] };

  const boundary = "shiftcheckerboundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(settings)}\r\n--${boundary}--`;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const res = await fetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!res.ok) throw new Error("drive save failed");
  return res.json();
}
