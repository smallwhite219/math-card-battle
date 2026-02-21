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
        sheet.getRange('A1:H1').setValues([['班級', '座號', '驗證碼', '目前關卡', '最高關卡', '玩家HP', '道具加成', '上次遊玩時間']]);
    }
}

function findStudentRow(classId, seatNum) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(classId) && String(data[i][1]) === String(seatNum)) {
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
            // New student — will register on first save
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
        const storedPin = String(data[2]);

        if (storedPin && storedPin !== String(pin)) {
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
            stage: data[3],
            maxStage: data[4],
            playerHp: data[5],
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
        const rowData = [classId, seat, pin || '', stage, maxStage, playerHp, buffsJson, now];

        if (row === -1) {
            sheet.appendRow(rowData);
        } else {
            sheet.getRange(row, 1, 1, 8).setValues([rowData]);
        }

        return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: 'Unknown action' });
}
