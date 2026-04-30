import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';
import { Upload, FileText, Check, AlertCircle, ChevronRight, Database, Trash2 } from 'lucide-react';

export default function UploadCSV() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    name: '',
    usn: '',
    email: '',
    branch_code: ''
  });
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Success
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(Object.keys(results.data[0] || {}));
        setStep(2);
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        alert('Failed to parse CSV: ' + error.message);
      }
    });
  };

  const handleUpload = async () => {
    if (!mapping.name || !mapping.usn) {
      alert('Name and USN mappings are required');
      return;
    }

    try {
      setUploading(true);
      
      const studentsToInsert = csvData.map(row => ({
        name: row[mapping.name],
        usn: row[mapping.usn]?.toString().toUpperCase().trim(),
        email: mapping.email ? row[mapping.email] : null,
        branch_code: mapping.branch_code ? row[mapping.branch_code] : 'CS', // Default or mapped
        batch: '2024-2028',
        is_active: true
      })).filter(s => s.usn && s.name);

      const { data, error } = await supabase
        .from('students')
        .upsert(studentsToInsert, { 
          onConflict: 'usn',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      setResults({
        success: studentsToInsert.length,
        failed: 0,
        errors: []
      });
      setStep(3);
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({ name: '', usn: '', email: '', branch_code: '' });
    setStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-display-sm text-primary font-display">Student Roster Import</h1>
        <p className="text-secondary text-lg">Batch upload your student data via CSV to get started.</p>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-4 flex-1 last:flex-none">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= s ? 'bg-[#6366F1] text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-surface-raised text-tertiary'
            }`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-[#6366F1]' : 'bg-[#ffffff08]'}`}></div>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card p-12 border-dashed border-2 border-[#ffffff10] flex flex-col items-center text-center gap-6 group hover:border-[#6366F140] transition-all cursor-pointer relative">
          <input 
            type="file" 
            accept=".csv" 
            onChange={onFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center text-tertiary group-hover:text-[#6366F1] group-hover:scale-110 transition-all">
            <Upload size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary mb-2">Upload Roster CSV</h3>
            <p className="text-secondary max-w-xs mx-auto">Drag and drop your file here, or click to browse. Only .csv files are supported currently.</p>
          </div>
          <div className="text-micro text-tertiary uppercase font-black tracking-widest bg-surface-raised px-4 py-2 rounded-full">
            Recommended: name, usn, email
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-[#6366F1]" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-primary">{file?.name}</h3>
                  <p className="text-sm text-tertiary">{csvData.length} rows found</p>
                </div>
              </div>
              <button onClick={reset} className="text-danger-fg hover:underline text-sm font-medium flex items-center gap-1">
                <Trash2 size={14} /> Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-micro text-tertiary uppercase font-black tracking-widest">Column Mapping</h4>
                <div className="space-y-4">
                  {Object.keys(mapping).map((field) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-secondary capitalize">{field.replace('_', ' ')} <span className="text-[#6366F1]">*</span></label>
                      <select 
                        className="input h-10 py-0"
                        value={mapping[field]}
                        onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                      >
                        <option value="">Select CSV Column</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-micro text-tertiary uppercase font-black tracking-widest">Data Preview</h4>
                <div className="card bg-void border-[#ffffff05] p-4 h-[300px] overflow-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="text-tertiary border-b border-[#ffffff05]">
                      <tr>
                        {headers.slice(0, 3).map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff03] text-secondary">
                      {csvData.slice(0, 8).map((row, i) => (
                        <tr key={i}>
                          {headers.slice(0, 3).map(h => <td key={h} className="py-2 pr-4 truncate max-w-[120px]">{row[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary px-12 py-4 text-lg group"
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Process Import <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-12 flex flex-col items-center text-center gap-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 rounded-full bg-success-bg flex items-center justify-center text-success-fg border border-success-border shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <Check size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-display text-primary mb-2">Import Successful!</h2>
            <p className="text-secondary max-w-sm mx-auto">Successfully imported <span className="text-primary font-bold">{results.success}</span> students into the roster.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={reset} className="btn-secondary px-8 py-3 font-bold">Import More</button>
            <button onClick={() => window.location.href = '/attendance'} className="btn-primary px-8 py-3 font-bold flex items-center gap-2">
              <Database size={18} /> Mark Attendance Now
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      {step === 1 && (
        <div className="bg-[#6366F110] border border-[#6366F120] rounded-2xl p-6 flex gap-4">
          <AlertCircle className="text-[#6366F1] shrink-0" size={24} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-primary">Import Guidelines</h4>
            <p className="text-sm text-secondary leading-relaxed">
              Ensure your CSV file contains columns for student names and unique identifiers (USN). If a USN already exists in the system, the student information will be updated instead of duplicated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
