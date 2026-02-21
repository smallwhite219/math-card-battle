// ===== 數學卡牌戰鬥 — Google Apps Script =====
// 部署方式：在 Google Sheets 中，點擊「擴充功能 → Apps Script」，
// 貼上此程式碼，然後「部署 → 管理部署作業 → 編輯 → 版本選新版本」
// 存取權限設為「任何人」，取得部署 URL 後貼回前端 App.jsx 的 API_URL。

const SHEET_NAME = '工作表1';
const HEADERS = ['班級', '座號', '驗證碼', '目前關卡', '最高關卡', '玩家HP', '道具加成', '上次遊玩時間'];

function getSheet() {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ensureHeaders() {
    const sheet = getSheet();
    // Always overwrite headers to ensure correct 8-column layout
    sheet.getRange('A1:H1').setValues([HEADERS]);
    // Format 座號 and 驗證碼 columns as plain text to preserve leading zeros
    sheet.getRange('B:C').setNumberFormat('@');
}

function findStudentRow(classId, seatNum) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(classId).trim() &&
            String(data[i][1]).trim() === String(seatNum).trim()) {
            return i + 1;
        }
    }
    return -1;
}

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
        const pin = e.parameter.pin || '';
        const row = findStudentRow(classId, seat);

        if (row === -1) {
            return createJsonResponse({
                found: false,
                isNew: true,
                stage: 1,
                maxStage: 1,
                playerHp: 100,
                buffs: null
            });
        }

        // Existing student — verify PIN
        const sheet = getSheet();
        const data = sheet.getRange(row, 1, 1, 8).getValues()[0];
        const storedPin = String(data[2]).trim();

        if (storedPin && storedPin !== String(pin).trim()) {
            return createJsonResponse({
                found: true,
                error: 'PIN_MISMATCH',
                message: '驗證碼錯誤！'
            });
        }

        let buffs = null;
        try {
            if (data[6]) buffs = JSON.parse(data[6]);
        } catch (ex) { /* ignore */ }

        return createJsonResponse({
            found: true,
            stage: Number(data[3]) || 1,
            maxStage: Number(data[4]) || 1,
            playerHp: Number(data[5]) || 100,
            buffs: buffs,
            lastPlayed: data[7]
        });
    }

    return createJsonResponse({ error: 'Unknown action' });
}

function doPost(e) {
    ensureHeaders();
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'save') {
        const { classId, seat, pin, stage, maxStage, playerHp, buffs } = body;
        const sheet = getSheet();
        const row = findStudentRow(classId, seat);
        const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        const buffsJson = buffs ? JSON.stringify(buffs) : '';
        const rowData = [String(classId), String(seat), String(pin || ''), Number(stage), Number(maxStage), Number(playerHp), buffsJson, now];

        if (row === -1) {
            const newRow = sheet.getLastRow() + 1;
            sheet.getRange(newRow, 1, 1, 8).setValues([rowData]);
        } else {
            sheet.getRange(row, 1, 1, 8).setValues([rowData]);
        }

        return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: 'Unknown action' });
}
