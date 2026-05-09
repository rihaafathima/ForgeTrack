import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = process.argv[2];
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  console.log("Total rows:", rawRows.length);
  console.log("Row 0:", rawRows[0]);
  console.log("Row 1:", rawRows[1]);
  console.log("Row 2:", rawRows[2]);
  console.log("Row 3:", rawRows[3]);
});
