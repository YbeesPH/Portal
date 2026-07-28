/*==================================================================
  YBEES Inc. — Employee Portal
  Google Apps Script backend (Code.gs) — FRESH START version

  This is the server side the portal's HTML talks to via API_URL /
  apiGet() / apiPost(). It reads and writes two sheets in THIS
  spreadsheet: "Employees" and "Performance".

  This version is meant for a brand-new / empty spreadsheet and
  comes with a one-time setup function that seeds sample data so
  you have something to log in with immediately.

  ---------------------------------------------------------------
  SETUP
  ---------------------------------------------------------------
  1. Open the Google Sheet you want to use as the database
     (can be blank).
  2. Extensions > Apps Script.
  3. Delete any placeholder code and paste this whole file in.
  4. In the function dropdown (top toolbar of the Apps Script
     editor), select "setupFreshDatabase", then click Run.
     - The first run will ask you to authorize the script — approve
       it (it needs permission to edit the spreadsheet).
     - This creates "Employees" and "Performance" sheets (or
       WIPES THEM if they already exist — see warning below) and
       fills them with sample employees so the app is usable
       right away.
  5. Deploy > New deployment > select type "Web app" > Execute as
     "Me" > Who has access "Anyone" > Deploy. Copy the /exec URL.
  6. Paste that URL into the HTML file's API_URL constant
     (near the top of the <script> block).
  7. Open the portal page and log in with one of the seeded
     accounts below.

  WARNING: setupFreshDatabase() CLEARS the "Employees" and
  "Performance" sheets before seeding — only run it when you
  actually want to wipe/reset the data in this spreadsheet.
  Everyday use of the app (adding/editing employees, grading, etc.)
  never calls this function; it only runs when you manually
  trigger it from the editor.

  ---------------------------------------------------------------
  SEEDED LOGIN ACCOUNTS (all use temp password "Welcome1" and will
  be prompted to set a new password on first login)
  ---------------------------------------------------------------
  EMP001  Dela Cruz, Juan       — System Admin (full access)
  EMP002  Santos, Maria         — Admin
  EMP003  Reyes, Angela         — Employee
  EMP004  Tan, Michael          — Employee

  Feel free to edit the SEED_EMPLOYEES array below before running
  setupFreshDatabase() if you'd rather seed your own names.
==================================================================*/

const SHEET_EMPLOYEES = "Employees";
const SHEET_PERFORMANCE = "Performance";
const PHOTOS_FOLDER_NAME = "YBEES Employee Photos";

const MONTHS = ["July", "August", "September", "October", "November", "December"];

const EMP_HEADERS = [
  "empId", "name", "position", "department", "team", "role", "status",
  "hireDate", "password", "firstLogin", "photo", "nickname", "tagline"
];

const PERF_HEADERS = ["empId", "month", "quality", "quantity", "projects", "mistakeRatio", "lastUpdated"];

// Edit these before running setupFreshDatabase() if you want different seed data.
const SEED_EMPLOYEES = [
  { empId: "EMP001", name: "Dela Cruz, Juan",  position: "HR-Head",  department: "Human Resources", role: "System Admin", status: "Active", hireDate: "2023-01-09" },
  { empId: "EMP002", name: "Santos, Maria",    position: "Manager",  department: "Operations",      role: "Admin",        status: "Active", hireDate: "2023-03-15" },
  { empId: "EMP003", name: "Reyes, Angela",    position: "NWD-Associate", department: "Web Development", role: "Employee", status: "Active", hireDate: "2024-02-01" },
  { empId: "EMP004", name: "Tan, Michael",     position: "NEF-Associate", department: "Engineering",     role: "Employee", status: "Active", hireDate: "2024-06-10" }
];
const SEED_PASSWORD = "Welcome1";

/*==================================================================
  ENTRY POINTS
==================================================================*/

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "getEmployees") {
      return jsonOut({ ok: true, employees: readEmployees() });
    }
    return jsonOut({ ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};
    let result;

    switch (action) {
      case "upsertEmployee":     result = upsertEmployee(payload); break;
      case "deleteEmployee":     result = deleteEmployeeRow(payload); break;
      case "setPassword":        result = setPassword(payload); break;
      case "setRole":            result = setRole(payload); break;
      case "updateProfileInfo":  result = updateProfileInfo(payload); break;
      case "saveGrades":         result = saveGrades(payload); break;
      case "uploadPhoto":        result = uploadPhoto(payload); break;
      default:
        return jsonOut({ ok: false, error: "Unknown action: " + action });
    }

    return jsonOut({ ok: true, result: result });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/*==================================================================
  ONE-TIME SETUP — run manually from the Apps Script editor
==================================================================*/

/**
 * Wipes (or creates) the Employees and Performance sheets and fills
 * them with sample data so the portal is immediately usable.
 * Run this once, on purpose, from the Apps Script editor's function
 * dropdown. Safe to re-run any time you want to reset back to the
 * sample data — but note it WILL erase whatever is currently in
 * those two sheets first.
 */
function setupFreshDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const empSh = resetSheet_(ss, SHEET_EMPLOYEES, EMP_HEADERS);
  const perfSh = resetSheet_(ss, SHEET_PERFORMANCE, PERF_HEADERS);

  SEED_EMPLOYEES.forEach(seed => {
    const teamMatch = /^(NWD|NEF|NPD)/i.exec(seed.position || "");
    const row = EMP_HEADERS.map(h => {
      if (h === "team") return teamMatch ? teamMatch[1].toUpperCase() : "";
      if (h === "password") return SEED_PASSWORD;
      if (h === "firstLogin") return true;
      if (h === "photo" || h === "nickname" || h === "tagline") return "";
      return seed[h] !== undefined ? seed[h] : "";
    });
    empSh.appendRow(row);

    MONTHS.forEach(month => {
      perfSh.appendRow([seed.empId, month, null, null, null, null, null]);
    });
  });

  Logger.log("Fresh database ready. Seeded " + SEED_EMPLOYEES.length + " employees.");
  Logger.log('Log in with any Employee ID above and password "' + SEED_PASSWORD + '" — you will be asked to set a new password on first login.');

  return { ok: true, employeesSeeded: SEED_EMPLOYEES.length };
}

function resetSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (sh) {
    sh.clear();
  } else {
    sh = ss.insertSheet(name);
  }
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}

/*==================================================================
  SHEET HELPERS
==================================================================*/

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRowByEmpId_(sh, empId) {
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(empId)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function numOrNull_(v) {
  return (v === "" || v === null || v === undefined) ? null : Number(v);
}

/*==================================================================
  READ: employees + performance, assembled together
==================================================================*/

function readEmployees() {
  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();
  const perfByEmp = readPerformanceByEmp_();

  return rows
    .filter(r => r[0] !== "" && r[0] !== null)
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);

      obj.firstLogin = (obj.firstLogin === true || obj.firstLogin === "TRUE" || obj.firstLogin === "true");
      if (obj.hireDate instanceof Date) {
        obj.hireDate = Utilities.formatDate(obj.hireDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj.team = obj.team || null;
      obj.photo = obj.photo || null;
      obj.nickname = obj.nickname || "";
      obj.tagline = obj.tagline || "";
      obj.department = obj.department || "";
      obj.performance = perfByEmp[obj.empId] || emptyPerformance_();

      return obj;
    });
}

function emptyPerformance_() {
  const perf = {};
  MONTHS.forEach(m => perf[m] = { quality: null, quantity: null, projects: null, mistakeRatio: null, lastUpdated: null });
  return perf;
}

function readPerformanceByEmp_() {
  const sh = getSheet_(SHEET_PERFORMANCE, PERF_HEADERS);
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();
  const map = {};

  rows.forEach(r => {
    if (!r[0]) return;
    const row = {};
    headers.forEach((h, i) => row[h] = r[i]);
    if (!map[row.empId]) map[row.empId] = emptyPerformance_();

    let lastUpdated = row.lastUpdated;
    if (lastUpdated instanceof Date) lastUpdated = lastUpdated.toISOString();

    map[row.empId][row.month] = {
      quality: numOrNull_(row.quality),
      quantity: numOrNull_(row.quantity),
      projects: numOrNull_(row.projects),
      mistakeRatio: numOrNull_(row.mistakeRatio),
      lastUpdated: lastUpdated || null
    };
  });

  return map;
}

/*==================================================================
  WRITE ACTIONS
==================================================================*/

function upsertEmployee(payload) {
  if (!payload.empId) throw new Error("empId is required");

  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(sh, payload.empId);
  const isNew = rowNum === -1;

  const rowValues = EMP_HEADERS.map(h => {
    let v = payload[h];
    if (v === undefined || v === null) {
      if (h === "firstLogin") return isNew ? true : "";
      if (h === "password" && isNew) return "demo123";
      return "";
    }
    return v;
  });

  if (isNew) {
    sh.appendRow(rowValues);
  } else {
    sh.getRange(rowNum, 1, 1, EMP_HEADERS.length).setValues([rowValues]);
  }

  if (payload.performance) {
    savePerformanceForEmp_(payload.empId, payload.performance);
  } else if (isNew) {
    seedPerformanceRows_(payload.empId);
  }

  return { empId: payload.empId };
}

function deleteEmployeeRow(payload) {
  const empSh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(empSh, payload.empId);
  if (rowNum !== -1) empSh.deleteRow(rowNum);

  const perfSh = getSheet_(SHEET_PERFORMANCE, PERF_HEADERS);
  const data = perfSh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(payload.empId)) perfSh.deleteRow(i + 1);
  }

  return { empId: payload.empId, deleted: true };
}

function setPassword(payload) {
  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(sh, payload.empId);
  if (rowNum === -1) throw new Error("Employee not found: " + payload.empId);

  sh.getRange(rowNum, EMP_HEADERS.indexOf("password") + 1).setValue(payload.password);
  sh.getRange(rowNum, EMP_HEADERS.indexOf("firstLogin") + 1).setValue(!!payload.firstLogin);

  return { empId: payload.empId };
}

function setRole(payload) {
  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(sh, payload.empId);
  if (rowNum === -1) throw new Error("Employee not found: " + payload.empId);

  sh.getRange(rowNum, EMP_HEADERS.indexOf("role") + 1).setValue(payload.role);
  return { empId: payload.empId };
}

function updateProfileInfo(payload) {
  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(sh, payload.empId);
  if (rowNum === -1) throw new Error("Employee not found: " + payload.empId);

  sh.getRange(rowNum, EMP_HEADERS.indexOf("nickname") + 1).setValue(payload.nickname || "");
  sh.getRange(rowNum, EMP_HEADERS.indexOf("tagline") + 1).setValue(payload.tagline || "");
  return { empId: payload.empId };
}

function saveGrades(payload) {
  if (!payload.performance) throw new Error("performance object is required");
  savePerformanceForEmp_(payload.empId, payload.performance);
  return { empId: payload.empId };
}

function savePerformanceForEmp_(empId, performance) {
  const sh = getSheet_(SHEET_PERFORMANCE, PERF_HEADERS);
  const data = sh.getDataRange().getValues();

  MONTHS.forEach(month => {
    const m = performance[month] || {};
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(empId) && data[i][1] === month) { rowIndex = i + 1; break; }
    }

    const values = [
      empId, month,
      m.quality === undefined ? null : m.quality,
      m.quantity === undefined ? null : m.quantity,
      m.projects === undefined ? null : m.projects,
      m.mistakeRatio === undefined ? null : m.mistakeRatio,
      m.lastUpdated || new Date().toISOString()
    ];

    if (rowIndex === -1) {
      sh.appendRow(values);
    } else {
      sh.getRange(rowIndex, 1, 1, PERF_HEADERS.length).setValues([values]);
    }
  });
}

function seedPerformanceRows_(empId) {
  const sh = getSheet_(SHEET_PERFORMANCE, PERF_HEADERS);
  MONTHS.forEach(month => {
    sh.appendRow([empId, month, null, null, null, null, null]);
  });
}

/*==================================================================
  PHOTO UPLOAD (saved to Drive, returned as a hotlink URL)
==================================================================*/

function uploadPhoto(payload) {
  const empId = payload.empId;
  const dataUrl = payload.dataUrl;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");

  const contentType = match[1];
  const base64 = match[2];
  const bytes = Utilities.base64Decode(base64);
  const ext = contentType.split("/")[1].split("+")[0];
  const fileName = (payload.fileName || (empId + "_photo")) + "." + ext;

  const blob = Utilities.newBlob(bytes, contentType, fileName);
  const folder = getOrCreatePhotosFolder_();

  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const url = "https://drive.google.com/uc?export=view&id=" + file.getId();

  const sh = getSheet_(SHEET_EMPLOYEES, EMP_HEADERS);
  const rowNum = findRowByEmpId_(sh, empId);
  if (rowNum !== -1) {
    sh.getRange(rowNum, EMP_HEADERS.indexOf("photo") + 1).setValue(url);
  }

  return { url: url };
}

function getOrCreatePhotosFolder_() {
  const folders = DriveApp.getFoldersByName(PHOTOS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(PHOTOS_FOLDER_NAME);
}
