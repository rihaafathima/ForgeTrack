
const XLSX = require('../frontend/node_modules/xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'Data Engineering and AI - Actual Program.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheets:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        console.log('Sample data (first 3 rows):');
        console.log(JSON.stringify(data.slice(0, 3), null, 2));
    });
} catch (error) {
    console.error('Error reading file:', error.message);
}
