const { google } = require('googleapis');
const path = require('path');

class SheetService {
    async leerPlanilla(spreadsheetId, range) {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../../credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        return response.data.values;
    }
}
module.exports = new SheetService();