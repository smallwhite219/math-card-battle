// ===== 數學卡牌戰鬥 — Google Apps Script =====
// 部署方式：在 Google Sheets 中，點擊「擴充功能 → Apps Script」，
// 貼上此程式碼，然後「部署 → 管理部署作業 → 編輯 → 版本選新版本」
// 存取權限設為「任何人」，取得部署 URL 後貼回前端 App.jsx 的 API_URL。

const SHEET_NAME = '工作表1';

function getSheet() {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ensureHeaders() {
    const sheet = getSheet();
    const firstCell = sheet.getRange('A1').getValue();
    if (firstCell !== '班級') {
        sheet.getRange('A1:G1').setValues([['班級', '座號', '目前關卡', '最高關卡', '玩家HP', '道具加成', '上次遊玩時間']]);
    }
    // Migrate: if only 6 columns, add 7th header
    const lastCol = sheet.getLastColumn();
    if (lastCol === 6) {
        sheet.getRange(1, 6, 1, 1).setValue('道具加成');
        sheet.getRange(1, 7, 1, 1).setValue('上次遊玩時間');
        // Shift existing time data from col 6 to col 7
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            const times = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
            sheet.getRange(2, 7, lastRow - 1, 1).setValues(times);
            sheet.getRange(2, 6, lastRow - 1, 1).clearContent();
        }
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

// CORS headers for cross-origin requests
function createJsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
    ensureHeaders();
    const action = e.parameter.action;

    if (action === 'load') {
        const classId = e.parameter.class;
        const seat = e.parameter.seat;
        const row = findStudentRow(classId, seat);

        if (row === -1) {
            return createJsonResponse({
                found: false,
                stage: 1,
                maxStage: 1,
                playerHp: 100,
                buffs: null
            });
        }

        const sheet = getSheet();
        const data = sheet.getRange(row, 1, 1, 7).getValues()[0];
        let buffs = null;
        try {
            if (data[5]) buffs = JSON.parse(data[5]);
        } catch (ex) { /* ignore parse errors */ }

        return createJsonResponse({
            found: true,
            stage: data[2],
            maxStage: data[3],
            playerHp: data[4],
            buffs: buffs,
            lastPlayed: data[6]
        });
    }

    return createJsonResponse({ error: 'Unknown action' });
}

function doPost(e) {
    ensureHeaders();
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'save') {
        const { classId, seat, stage, maxStage, playerHp, buffs } = body;
        const sheet = getSheet();
        const row = findStudentRow(classId, seat);
        const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        const buffsJson = buffs ? JSON.stringify(buffs) : '';
        const rowData = [classId, seat, stage, maxStage, playerHp, buffsJson, now];

        if (row === -1) {
            sheet.appendRow(rowData);
        } else {
            sheet.getRange(row, 1, 1, 7).setValues([rowData]);
        }

        return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: 'Unknown action' });
}
