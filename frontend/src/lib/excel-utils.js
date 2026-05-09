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
        // Do NOT use cellDates: true, it causes timezone shifting issues
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets = {};

        workbook.SheetNames.forEach(name => {
          const safeName = String(name);
          const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
          sheets[safeName] = rawRows;
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
 * Converts Excel serial date or string to YYYY-MM-DD.
 * @param {number|string|Date} excelDate 
 * @returns {string} ISO Date string (YYYY-MM-DD)
 */
export const formatExcelDate = (excelDate) => {
  if (excelDate === null || excelDate === undefined || excelDate === '') return null;

  let y, m, d;

  if (excelDate instanceof Date) {
    y = excelDate.getFullYear();
    m = excelDate.getMonth() + 1;
    d = excelDate.getDate();
  } else if (typeof excelDate === 'number') {
    // Excel base date is 1899-12-30. We use UTC to avoid any timezone shifts
    const date = new Date(Date.UTC(1899, 11, 30 + excelDate));
    y = date.getUTCFullYear();
    m = date.getUTCMonth() + 1;
    d = date.getUTCDate();
  } else if (typeof excelDate === 'string') {
    // Try to parse DD-MM-YYYY or DD/MM/YYYY first as it's the expected format in India
    const parts = excelDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [y, m, d] = parts.map(Number);
      } else {
        // Default to DD-MM-YYYY
        [d, m, y] = parts.map(Number);
        // If month is > 12, it must be MM-DD-YYYY format
        if (m > 12) {
          const temp = d;
          d = m;
          m = temp;
        }
        if (y < 100) y += 2000;
      }
    } else {
      // Fallback for weird strings
      const date = new Date(excelDate);
      if (isNaN(date.getTime())) return null;
      y = date.getFullYear();
      m = date.getMonth() + 1;
      d = date.getDate();
    }
  }

  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;

  // Return padded YYYY-MM-DD
  return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
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
