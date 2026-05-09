import * as XLSX from 'xlsx';

/**
 * Reads an Excel or CSV file and returns an object with sheet names and their data.
 * @param {File} file 
 * @returns {Promise<{ [sheetName: string]: any[][] }>}
 */
export const readSpreadsheet = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheets = {};
        
        workbook.SheetNames.forEach(name => {
          const safeName = name instanceof Date ? name.toISOString().split('T')[0] : String(name);
          const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
          
          // Recursively convert any Date objects to strings to prevent React crashes
          sheets[safeName] = rawRows.map(row => 
            Array.isArray(row) 
              ? row.map(cell => cell instanceof Date ? cell.toISOString() : cell) 
              : row
          );
        });
        
        resolve(sheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Converts Excel serial date to JS Date.
 * @param {number|string|Date} excelDate 
 * @returns {string} ISO Date string (YYYY-MM-DD)
 */
export const formatExcelDate = (excelDate) => {
  if (!excelDate) return null;
  
  let date;
  if (excelDate instanceof Date) {
    date = excelDate;
  } else if (typeof excelDate === 'number') {
    // Excel base date is 1899-12-30
    date = new Date((excelDate - 25569) * 86400 * 1000);
  } else if (typeof excelDate === 'string') {
    const parts = excelDate.split(/[-/]/);
    if (parts.length === 3) {
      let d, m, y;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [y, m, d] = parts.map(Number);
      } else {
        // DD-MM-YYYY or MM-DD-YYYY (Assuming DD-MM-YYYY as per user preference)
        [d, m, y] = parts.map(Number);
        if (y < 100) y += 2000;
      }
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(excelDate);
    }
  }

  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

/**
 * Gets sample rows and headers for AI analysis.
 */
export const getSheetSnapshot = (rows, sampleCount = 5) => {
  if (!rows || rows.length === 0) return null;
  
  const headers = rows[0];
  const sampleData = rows.slice(1, sampleCount + 1);
  
  return {
    headers,
    sampleData
  };
};
