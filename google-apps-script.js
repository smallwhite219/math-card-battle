// ===== 數學卡牌戰鬥 — Google Apps Script =====
// 部署方式：在 Google Sheets 中，點擊「擴充功能 → Apps Script」，
// 貼上此程式碼，然後「部署 → 新增部署作業 → 網頁應用程式」
// 存取權限設為「任何人」，取得部署 URL 後貼回前端 App.jsx 的 API_URL。

const SHEET_NAME = '工作表1';

function getSheet() {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ensureHeaders() {
    const sheet = getSheet();
    const firstCell = sheet.getRange('A1').getValue();
    if (firstCell !== '班級') {
        sheet.getRange('A1:F1').setValues([['班級', '座號', '目前關卡', '最高關卡', '玩家HP', '上次遊玩時間']]);
    }
}

function findStudentRow(classId, seatNum) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(classId) && String(data[i][1]) === String(seatNum)) {
            return i + 1; // 1-indexed row
        }
    }
    return -1;
}

function doGet(e) {
    ensureHeaders();
    const action = e.parameter.action;

    if (action === 'load') {
        const classId = e.parameter.class;
        const seat = e.parameter.seat;
        const row = findStudentRow(classId, seat);

        if (row === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                found: false,
                stage: 1,
                maxStage: 1,
                playerHp: 100
            })).setMimeType(ContentService.MimeType.JSON);
        }

        const sheet = getSheet();
        const data = sheet.getRange(row, 1, 1, 6).getValues()[0];
        return ContentService.createTextOutput(JSON.stringify({
            found: true,
            stage: data[2],
            maxStage: data[3],
            playerHp: data[4],
            lastPlayed: data[5]
        })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    ensureHeaders();
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'save') {
        const { classId, seat, stage, maxStage, playerHp } = body;
        const sheet = getSheet();
        const row = findStudentRow(classId, seat);
        const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        const rowData = [classId, seat, stage, maxStage, playerHp, now];

        if (row === -1) {
            sheet.appendRow(rowData);
        } else {
            sheet.getRange(row, 1, 1, 6).setValues([rowData]);
        }

        return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
        .setMimeType(ContentService.MimeType.JSON);
}
