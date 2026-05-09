import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Upload, FileText, Check, AlertCircle, ChevronRight, 
  Database, Trash2, Brain, Loader2, Calendar, 
  Info, AlertTriangle, ListChecks, ArrowRight 
} from 'lucide-react';
import { readSpreadsheet, formatExcelDate, getSheetSnapshot } from '../../lib/excel-utils';
import { analyzeSheetStructure, inferDates } from '../../lib/attendance-ai';

export default function BulkAttendanceUpload() {
  // --- States ---
  const [step, setStep] = useState(1); // 1: Upload, 2: Sheets, 3: AI Analysis, 4: Conflicts, 5: Review, 6: Success
  const [file, setFile] = useState(null);
  const [allSheetsData, setAllSheetsData] = useState({}); // { name: rows[][] }
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  const [sheetMappings, setSheetMappings] = useState({}); // { sheetName: { mapping, attendanceColumns, hasMissingDateHeaders } }
  const [headerRows, setHeaderRows] = useState({}); // { sheetName: index }
  const [scheduleHint, setScheduleHint] = useState('');
  const [inferredDatesMap, setInferredDatesMap] = useState({}); // { sheetName: [dates] }

  // Conflicts
  const [conflicts, setConflicts] = useState([]); // [{ date, existingSession, sheetName }]
  const [resolution, setResolution] = useState('skip'); // 'skip', 'overwrite', 'merge'

  // Final Results
  const [results, setResults] = useState({ sessions: 0, attendance: 0, errors: [] });

  useEffect(() => {
    console.log("Current Step:", step);
    console.log("Selected Sheets:", selectedSheets);
    console.log("Header Rows:", headerRows);
    console.log("Sheet Mappings:", sheetMappings);
  }, [step, selectedSheets, headerRows, sheetMappings]);

  // --- Handlers ---

  const onFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        setProcessing(true);
        const data = await readSpreadsheet(selectedFile);
        setAllSheetsData(data);
        const sheetNames = Object.keys(data);
        if (sheetNames.length === 1) {
          setSelectedSheets(sheetNames);
          setHeaderRows({ [sheetNames[0]]: 0 });
          setStep(2.5); // Go to header selection
        } else {
          setStep(2);
        }
      } catch (error) {
        console.error("File Read Error:", error);
        alert("Failed to read file: " + error.message);
      } finally {
        setProcessing(false);
      }
    }
  };

  const toggleSheet = (name) => {
    setSelectedSheets(prev => {
      const isSelected = prev.includes(name);
      if (isSelected) {
        return prev.filter(n => n !== name);
      } else {
        setHeaderRows(h => ({ ...h, [name]: 0 }));
        return [...prev, name];
      }
    });
  };

  const runAIAnalysis = async () => {
    try {
      setProcessing(true);
      const newMappings = {};
      
      for (const sheetName of selectedSheets) {
        const rows = allSheetsData[sheetName];
        const headerIdx = headerRows[sheetName] || 0;
        const headers = rows[headerIdx];
        const sampleData = rows.slice(headerIdx + 1, headerIdx + 6);
        console.log(`Analyzing sheet: ${sheetName}`, { headers, sampleData });
        
        const result = await analyzeSheetStructure(headers, sampleData);
        console.log(`AI result for ${sheetName}:`, result);

        // Defensive normalization
        const normalized = {
          mapping: { 
            name: result?.mapping?.name || '', 
            usn: result?.mapping?.usn || '', 
            email: result?.mapping?.email || '' 
          },
          attendanceColumns: Array.isArray(result?.attendanceColumns) ? result.attendanceColumns : [],
          hasMissingDateHeaders: !!result?.hasMissingDateHeaders
        };
        
        newMappings[sheetName] = normalized;
      }
      
      setSheetMappings(newMappings);
      
      // Always go to Step 3 for review, even if no dates are missing
      setStep(3);
    } catch (error) {
      console.error("AI Analysis CRASHED:", error);
      alert(`AI analysis failed: ${error.message}\n\nPlease check the console for details.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleInferDates = async () => {
    try {
      setProcessing(true);
      const newInferredMap = { ...inferredDatesMap };

      for (const sheetName of selectedSheets) {
        const mapping = sheetMappings[sheetName];
        if (mapping.hasMissingDateHeaders) {
          const count = mapping.attendanceColumns.filter(c => c.header === "Unknown").length;
          const dates = await inferDates(count, scheduleHint, new Date().toISOString().split('T')[0]);
          newInferredMap[sheetName] = dates; // Should be in DD-MM-YYYY from AI now
        }
      }

      setInferredDatesMap(newInferredMap);
      
      // Check for conflicts immediately after getting dates
      const allDates = [];
      Object.values(sheetMappings).forEach(m => {
        m.attendanceColumns.forEach(c => {
          if (c.header !== "Unknown") allDates.push(c.header);
        });
      });
      Object.values(newInferredMap).forEach(dates => allDates.push(...dates));

      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('date')
        .in('date', allDates.map(d => formatExcelDate(d))); // formatExcelDate handles DD-MM-YYYY too

      if (existingSessions?.length > 0) {
        setConflicts(existingSessions.map(s => s.date));
        setStep(4);
      } else {
        setStep(5);
      }
    } catch (error) {
      console.error("Date Inference Error:", error);
      alert(`Date inference failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const checkConflicts = async (mappings, inferredDates = {}) => {
    try {
      setProcessing(true);
      const datesToCheck = new Set();
      
      Object.entries(mappings).forEach(([sheetName, mapping]) => {
        mapping.attendanceColumns.forEach(col => {
          const date = col.header === "Unknown" 
            ? (inferredDates[sheetName]?.[mapping.attendanceColumns.indexOf(col)] || null)
            : formatExcelDate(col.inferredDate || col.header);
          if (date) datesToCheck.add(date);
        });
      });

      const datesArray = Array.from(datesToCheck);
      if (datesArray.length === 0) {
        setStep(5);
        return;
      }

      const { data: existingSessions, error } = await supabase
        .from('sessions')
        .select('date, topic')
        .in('date', datesArray);

      if (error) throw error;

      if (existingSessions.length > 0) {
        setConflicts(existingSessions);
        setStep(4);
      } else {
        setStep(5);
      }
    } catch (error) {
      console.error("Conflict Check Error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalUpload = async () => {
    try {
      setProcessing(true);
      let sessionCount = 0;
      let attendanceCount = 0;

      // 1. Process each sheet
      for (const sheetName of selectedSheets) {
        const rows = allSheetsData[sheetName];
        const headerIdx = headerRows[sheetName] || 0;
        const headers = rows[headerIdx];
        const dataRows = rows.slice(headerIdx + 1);
        const mapping = sheetMappings[sheetName];
        const inferred = inferredDatesMap[sheetName] || [];

        // 2. Prepare Sessions
        for (let i = 0; i < mapping.attendanceColumns.length; i++) {
          const colInfo = mapping.attendanceColumns[i];
          const rawDate = colInfo.header === "Unknown" ? inferred[i] : (colInfo.inferredDate || colInfo.header);
          const formattedDate = formatExcelDate(rawDate);

          if (!formattedDate) continue;

          // Upsert session
          const { data: session, error: sError } = await supabase
            .from('sessions')
            .upsert({
              date: formattedDate,
              topic: `Session from ${file.name} - ${sheetName}`,
              month_number: new Date(formattedDate).getMonth() + 1
            }, { onConflict: 'date' })
            .select()
            .single();

          if (sError && sError.code !== '23505') throw sError; // Ignore unique violation if upsert failed somehow
          
          const targetSessionId = session?.id || (await supabase.from('sessions').select('id').eq('date', formattedDate).single()).data.id;
          sessionCount++;

          // 3. Prepare Attendance for this session
          const attendanceRecords = [];
          
          // Find USN and Name column indices
          const usnIdx = headers.indexOf(mapping?.mapping?.usn);
          const nameIdx = headers.indexOf(mapping?.mapping?.name);
          const colIdx = colInfo.index;

          for (const row of dataRows) {
            const usn = row[usnIdx]?.toString().toUpperCase().trim();
            if (!usn) continue;

            // Get student ID (assume students exist or create if needed? 
            // Better to match against existing students to avoid orphans)
            const { data: student } = await supabase
              .from('students')
              .select('id')
              .eq('usn', usn)
              .single();

            if (!student) continue;

            const isPresent = !!row[colIdx]; // Basic truthy check (P, 1, true, etc)
            
            attendanceRecords.push({
              student_id: student.id,
              session_id: targetSessionId,
              present: isPresent,
              marked_by: 'bulk_upload'
            });
          }

          if (attendanceRecords.length > 0) {
            const { error: aError } = await supabase
              .from('attendance')
              .upsert(attendanceRecords, { onConflict: 'student_id, session_id' });
            
            if (aError) console.error("Attendance Insert Error:", aError);
            attendanceCount += attendanceRecords.length;
          }
        }
      }

      setResults({ sessions: sessionCount, attendance: attendanceCount, errors: [] });
      setStep(6);
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAllSheetsData({});
    setSelectedSheets([]);
    setSheetMappings({});
    setInferredDatesMap({});
    setHeaderRows({});
    setStep(1);
  };

  const safeFormatDisplayDate = (date) => {
    try {
      if (!date) return "";
      if (date instanceof Date) {
        // Return DD-MM-YYYY
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
      }
      
      if (typeof date === 'number') {
        const formatted = formatExcelDate(date);
        return formatted ? formatted.split('-').reverse().join('-') : String(date);
      }

      const dateStr = String(date);
      if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const formatted = formatExcelDate(date);
        return formatted ? formatted.split('-').reverse().join('-') : dateStr;
      }
      return dateStr;
    } catch (error) {
      return String(date);
    }
  };

  // --- UI Renderers ---

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-display-sm text-primary font-display">AI Attendance Agent</h1>
          <p className="text-secondary text-lg">Intelligent bulk upload and sync from spreadsheets.</p>
        </div>
        {file && (
          <button onClick={reset} className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
            <Trash2 size={16} /> Reset
          </button>
        )}
      </header>

      {/* Progress Stepper */}
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= s ? 'bg-primary-600 text-white shadow-glow' : 'bg-surface-raised text-tertiary'
            }`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 6 && <div className={`flex-1 h-px ${step > s ? 'bg-primary-600' : 'bg-border-subtle'}`}></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 card p-12 border-dashed border-2 border-border-subtle flex flex-col items-center text-center gap-6 group hover:border-primary-500/40 transition-all cursor-pointer relative bg-surface-base/50 backdrop-blur-xl">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            <div className="w-24 h-24 rounded-full bg-surface-raised flex items-center justify-center text-tertiary group-hover:text-primary-500 group-hover:scale-110 transition-all shadow-inner">
              {processing ? <Loader2 size={40} className="animate-spin" /> : <Upload size={40} />}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary mb-2">Drop your spreadsheet</h3>
              <p className="text-secondary max-w-sm mx-auto">Excel or CSV files with attendance logs. Multiple sheets supported.</p>
            </div>
            <div className="flex gap-3">
              <span className="badge-outline">.XLSX</span>
              <span className="badge-outline">.CSV</span>
              <span className="badge-outline">.XLS</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card p-6 bg-primary-900/10 border-primary-500/20">
              <div className="flex gap-3 mb-4 text-primary-400">
                <Brain size={24} />
                <h4 className="font-bold">AI reasoning</h4>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Our AI Agent will automatically identify student USNs and date columns, even if the headers are formatted differently.
              </p>
            </div>
            <div className="card p-6 bg-surface-raised/50 border-border-subtle">
              <div className="flex gap-3 mb-4 text-secondary">
                <Info size={24} />
                <h4 className="font-bold">Date Inference</h4>
              </div>
              <p className="text-sm text-tertiary leading-relaxed">
                Missing dates in headers? Just tell the AI your class schedule and it will intelligently fill in the gaps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Sheet Selection */}
      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="card p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-xl bg-primary-900/20 text-primary-400">
                <ListChecks size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Select Sheets</h3>
                <p className="text-secondary">Which sheets contain attendance data?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(allSheetsData).map(name => (
                <button 
                  key={name}
                  onClick={() => toggleSheet(name)}
                  className={`p-6 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                    selectedSheets.includes(name) 
                      ? 'bg-primary-900/20 border-primary-500 shadow-glow' 
                      : 'bg-surface-raised border-border-subtle hover:border-primary-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <FileText size={24} className={selectedSheets.includes(name) ? 'text-primary-400' : 'text-tertiary'} />
                    {selectedSheets.includes(name) && <Check size={16} className="text-primary-400" />}
                  </div>
                  <h4 className={`font-bold truncate ${selectedSheets.includes(name) ? 'text-primary' : 'text-secondary'}`}>{name?.toString()}</h4>
                  <p className="text-xs text-tertiary mt-1">{allSheetsData[name].length} rows</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={() => setStep(2.5)}
              disabled={selectedSheets.length === 0 || processing}
              className="btn-primary px-10 py-4 text-lg flex items-center gap-3"
            >
              Continue to Header Selection <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
      {step === 2.5 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="card p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary-900/20 text-primary-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Identify Header Rows</h3>
                <p className="text-secondary">Click the row that contains the column names for each sheet.</p>
              </div>
            </div>

            <div className="space-y-12">
              {selectedSheets.map(sheetName => (
                <div key={sheetName} className="space-y-4">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <Check size={18} className="text-primary-400" /> {sheetName?.toString()}
                  </h4>
                  {allSheetsData[sheetName] ? (
                    <div className="overflow-x-auto border border-border-subtle rounded-xl bg-surface-raised/30 max-h-[300px]">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-surface-raised shadow-sm">
                          <tr>
                            <th className="px-4 py-2 border-b border-border-subtle text-tertiary w-10">#</th>
                            <th className="px-4 py-2 border-b border-border-subtle text-tertiary">Row Content Preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allSheetsData[sheetName].slice(0, 15).map((row, idx) => (
                            <tr 
                              key={idx} 
                              onClick={() => setHeaderRows(prev => ({ ...prev, [sheetName]: idx }))}
                              className={`cursor-pointer transition-all border-l-4 ${
                                headerRows[sheetName] === idx 
                                  ? 'bg-accent-glow/20 border-accent-glow text-primary shadow-sm' 
                                  : 'hover:bg-surface-raised/50 text-secondary border-transparent'
                              }`}
                            >
                              <td className="px-4 py-3 border-b border-border-subtle text-xs font-mono">
                                {headerRows[sheetName] === idx ? (
                                  <div className="bg-accent-glow text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                                    <Check size={10} />
                                  </div>
                                ) : idx + 1}
                              </td>
                              <td className="px-4 py-3 border-b border-border-subtle">
                                <div className="flex gap-2 overflow-hidden truncate max-w-2xl">
                                  {row && Array.isArray(row) ? row.map((cell, cIdx) => (
                                    <span key={cIdx} className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap border transition-colors ${
                                      headerRows[sheetName] === idx ? 'bg-accent-glow/20 border-accent-glow/30 text-accent-glow' : 'bg-surface-raised border-border-subtle text-tertiary'
                                    }`}>
                                      {cell?.toString() || '-'}
                                    </span>
                                  )) : <span className="text-tertiary">Empty row</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-danger-bg text-danger-fg rounded-xl border border-danger-border">
                      Error: Data for sheet "{sheetName}" not found.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={runAIAnalysis}
              className="btn-primary px-10 py-4 text-lg flex items-center gap-3 shadow-glow"
            >
              {processing ? <Loader2 size={24} className="animate-spin" /> : <><Brain size={24} /> Confirm Headers & Analyze</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Analysis / Mapping Editing */}
      {step === 3 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="card p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary-900/20 text-primary-400">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Review AI Mapping</h3>
                <p className="text-secondary">Verify and edit the detected columns for each sheet.</p>
              </div>
            </div>

            <div className="space-y-8">
              {Object.entries(sheetMappings).map(([sheetName, mapping]) => {
                const hRowIdx = headerRows[sheetName] || 0;
                const sheetData = allSheetsData[sheetName];
                const headers = sheetData ? (sheetData[hRowIdx] || []) : [];
                
                if (!sheetData) return null;

                return (
                  <div key={sheetName} className="p-6 rounded-2xl bg-surface-raised/30 border border-border-subtle space-y-6">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <FileText size={18} className="text-primary-400" /> {sheetName?.toString()}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-tertiary uppercase">Student Name Column</label>
                        <select 
                          className="input py-2"
                          value={mapping?.mapping?.name || ''}
                          onChange={(e) => {
                            setSheetMappings(prev => ({
                              ...prev,
                              [sheetName]: {
                                ...prev[sheetName],
                                mapping: { ...prev[sheetName].mapping, name: e.target.value }
                              }
                            }));
                          }}
                        >
                          {headers.map((h, i) => (
                            <option key={i} value={h?.toString() || ""} className="bg-surface-base text-primary">
                              {h?.toString() || `Column ${i+1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-tertiary uppercase">USN Column</label>
                        <select 
                          className="input py-2 bg-surface-base text-primary"
                          value={mapping?.mapping?.usn || ''}
                          onChange={(e) => {
                            setSheetMappings(prev => ({
                              ...prev,
                              [sheetName]: {
                                ...prev[sheetName],
                                mapping: { ...prev[sheetName].mapping, usn: e.target.value }
                              }
                            }));
                          }}
                        >
                          {headers.map((h, i) => <option key={i} value={h} className="bg-surface-base text-primary">{h || `Column ${i+1}`}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-tertiary uppercase">Email Column (Optional)</label>
                        <select 
                          className="input py-2 bg-surface-base text-primary"
                          value={mapping?.mapping?.email || ''}
                          onChange={(e) => {
                            setSheetMappings(prev => ({
                              ...prev,
                              [sheetName]: {
                                ...prev[sheetName],
                                mapping: { ...prev[sheetName].mapping, email: e.target.value }
                              }
                            }));
                          }}
                        >
                          <option value="" className="bg-surface-base text-primary">None</option>
                          {headers.map((h, i) => (
                            <option key={i} value={h?.toString() || ""} className="bg-surface-base text-primary">
                              {h?.toString() || `Column ${i+1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-tertiary uppercase">Attendance Dates Detected</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {mapping?.attendanceColumns?.map((col, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <input 
                              className="input py-1.5 text-xs font-medium bg-surface-base"
                              value={col?.header === "Unknown" 
                                ? safeFormatDisplayDate(inferredDatesMap[sheetName]?.[idx])
                                : safeFormatDisplayDate(col?.header)
                              }
                              placeholder="DD-MM-YYYY"
                              onChange={(e) => {
                                const newVal = e.target.value;
                                if (col.header === "Unknown") {
                                  setInferredDatesMap(prev => ({
                                    ...prev,
                                    [sheetName]: prev[sheetName] ? prev[sheetName].map((d, i) => i === idx ? newVal : d) : [newVal]
                                  }));
                                } else {
                                  setSheetMappings(prev => {
                                    const newCols = [...prev[sheetName].attendanceColumns];
                                    newCols[idx] = { ...newCols[idx], header: newVal };
                                    return {
                                      ...prev,
                                      [sheetName]: { ...prev[sheetName], attendanceColumns: newCols }
                                    };
                                  });
                                }
                              }}
                            />
                            <span className="text-[10px] text-tertiary px-1">Column {col.index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card p-6 bg-amber-900/10 border-amber-500/20 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Info size={18} />
                <h4 className="font-bold">Missing Dates?</h4>
              </div>
              <p className="text-sm text-secondary">If the columns above say "Unknown" or are blank, use the AI scheduler below to infer them automatically in <b>DD-MM-YYYY</b> format.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  className="input flex-1"
                  placeholder="e.g. Every Monday and Thursday"
                  value={scheduleHint}
                  onChange={(e) => setScheduleHint(e.target.value)}
                />
                <button 
                  onClick={handleInferDates}
                  disabled={!scheduleHint || processing}
                  className="btn-secondary px-6 flex items-center gap-2"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <><Brain size={16} /> Infer Dates</>}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between gap-4">
            <button 
              onClick={() => setStep(2.5)}
              className="btn-secondary px-8 py-4 flex items-center gap-2"
            >
              <ArrowRight size={20} className="rotate-180" /> Change Headers
            </button>
            <button 
              onClick={() => {
                setStep(4);
                checkConflicts(sheetMappings, inferredDatesMap);
              }}
              className="btn-primary px-10 py-4 text-lg flex items-center gap-3 shadow-glow"
            >
              Continue to Review <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Conflicts */}
      {step === 4 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="card p-8 space-y-8 bg-amber-900/5 border-amber-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-900/20 text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Duplicate Data Detected</h3>
                <p className="text-secondary">Existing records found for the following dates.</p>
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto custom-scrollbar space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-surface-base rounded-xl border border-border-subtle">
                  <div className="flex items-center gap-4">
                    <Calendar size={18} className="text-tertiary" />
                    <div>
                      <p className="font-bold text-primary">{safeFormatDisplayDate(c.date)}</p>
                      <p className="text-xs text-tertiary">Topic: {c.topic?.toString()}</p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Already Filled</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['skip', 'overwrite', 'merge'].map(mode => (
                <button 
                  key={mode}
                  onClick={() => setResolution(mode)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    resolution === mode ? 'bg-primary-900/20 border-primary-500 shadow-glow' : 'bg-surface-raised border-border-subtle'
                  }`}
                >
                  <h4 className="font-bold capitalize mb-1 text-primary">{mode}</h4>
                  <p className="text-xs text-tertiary">
                    {mode === 'skip' && 'Keep existing records and skip these dates from the file.'}
                    {mode === 'overwrite' && 'Replace existing records with data from the spreadsheet.'}
                    {mode === 'merge' && 'Add missing attendance marks to existing sessions.'}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(5)} className="btn-primary px-10 py-4 text-lg">Continue to Review</button>
          </div>
        </div>
      )}

      {/* Step 5: Final Review */}
      {step === 5 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="card p-8">
            <h3 className="text-2xl font-bold text-primary mb-6">Ready to Sync</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="p-6 bg-surface-raised rounded-2xl border border-border-subtle">
                  <h4 className="text-micro text-tertiary uppercase font-black tracking-widest mb-4">Upload Summary</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-secondary">Sheets</span>
                      <span className="text-primary font-bold">{selectedSheets.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Estimated Sessions</span>
                      <span className="text-primary font-bold">
                        {Object.values(sheetMappings).reduce((acc, m) => acc + m.attendanceColumns.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Duplicate Action</span>
                      <span className="text-amber-400 font-bold uppercase">{resolution}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-primary-900/10 rounded-2xl border border-primary-500/20">
                  <p className="text-sm text-secondary flex gap-3">
                    <Info size={18} className="text-primary-400 shrink-0" />
                    Student USNs will be matched against the existing database. New attendance marks will be created or updated.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-micro text-tertiary uppercase font-black tracking-widest">Identified Dates</h4>
                <div className="card bg-void border-border-subtle p-4 h-[250px] overflow-auto custom-scrollbar">
                  {Object.entries(sheetMappings).map(([name, mapping]) => (
                    <div key={name} className="mb-4 last:mb-0">
                      <h5 className="text-xs font-bold text-primary-400 mb-2 uppercase tracking-widest">{name?.toString()}</h5>
                      <div className="flex flex-wrap gap-2">
                        {mapping?.attendanceColumns?.map((c, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-surface-raised rounded border border-border-subtle text-secondary">
                            {c.header === "Unknown" ? safeFormatDisplayDate(inferredDatesMap[name]?.[i]) : safeFormatDisplayDate(c.header)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleFinalUpload}
              disabled={processing}
              className="btn-primary px-12 py-4 text-xl group font-display"
            >
              {processing ? <Loader2 size={24} className="animate-spin" /> : <>Start Intelligent Sync <ArrowRight className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Success */}
      {step === 6 && (
        <div className="card p-16 flex flex-col items-center text-center gap-8 animate-in zoom-in duration-500">
          <div className="w-32 h-32 rounded-full bg-success-bg flex items-center justify-center text-success-fg border border-success-border shadow-[0_0_60px_rgba(16,185,129,0.3)]">
            <Check size={64} />
          </div>
          <div>
            <h2 className="text-4xl font-display text-primary mb-3">Sync Complete!</h2>
            <p className="text-secondary text-lg max-w-md mx-auto">
              Successfully processed <span className="text-primary font-bold">{results.sessions}</span> sessions and synced <span className="text-primary font-bold">{results.attendance}</span> attendance marks.
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={reset} className="btn-secondary px-10 py-3 font-bold">Process Another File</button>
            <button onClick={() => window.location.href = '/attendance'} className="btn-primary px-10 py-3 font-bold flex items-center gap-2">
              <Database size={18} /> View Attendance Log
            </button>
          </div>
        </div>
      )}

      {/* Catch-all for unexpected states */}
      {![1, 2, 2.5, 3, 4, 5, 6].includes(step) && (
        <div className="card p-12 text-center space-y-4">
           <AlertCircle size={48} className="mx-auto text-danger-fg" />
           <h3 className="text-xl font-bold text-primary">Something went wrong</h3>
           <p className="text-secondary">The application reached an unexpected state: <b>{step}</b></p>
           <button onClick={reset} className="btn-primary px-8 py-2">Reset & Try Again</button>
        </div>
      )}

    </div>
  );
}
