const sheetsService = require('./services/sheetsService');

async function testFetch() {
    try {
        console.log("Fetching rows from Sheets...");
        // This will sync or just get rows
        const rows = await sheetsService.getRows('DF'); // assuming DF or UVDF is the sheet?
        console.log("Rows fetched.");
    } catch(err) {
        console.error(err);
    }
}
testFetch();
