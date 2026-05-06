import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronRight, User, TrendingUp, Calendar, ArrowLeft, Download } from 'lucide-react';

export default function StudentHistory() {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, present');

      const totalSessions = sessionData?.length || 0;
      
      const studentsWithStats = studentData?.map(s => {
        const studentAttendance = attendanceData?.filter(a => a.student_id === s.id && a.present) || [];
        const percentage = totalSessions > 0 ? (studentAttendance.length / totalSessions) * 100 : 0;
        return { ...s, presentCount: studentAttendance.length, percentage };
      });

      setStudents(studentsWithStats || []);
      setSessions(sessionData || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function viewStudentDetails(student) {
    try {
      setLoading(true);
      setSelectedStudent(student);
      
      const { data } = await supabase
        .from('attendance')
        .select(`
          present,
          marked_at,
          sessions (
            date,
            topic
          )
        `)
        .eq('student_id', student.id)
        .order('marked_at', { ascending: false });

      setStudentDetails(data || []);
    } catch (err) {
      console.error('Error fetching student details:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = () => {
    if (!selectedStudent || studentDetails.length === 0) return;
    
    const headers = ['Date', 'Topic', 'Status'];
    const rows = studentDetails.map(record => [
      new Date(record.sessions.date).toLocaleDateString(),
      record.sessions.topic,
      record.present ? 'Present' : 'Absent'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_${selectedStudent.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDetails = studentDetails.filter(record => 
    record.sessions.topic.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  if (loading && !selectedStudent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-secondary text-sm font-medium animate-pulse">Analyzing attendance records...</div>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <button 
          onClick={() => {
            setSelectedStudent(null);
            setSessionSearch('');
          }}
          className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Overview
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-[#6366F1] flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {selectedStudent.name.charAt(0)}
            </div>
            <div className="select-none cursor-default">
              <h1 className="text-display-sm text-primary font-display">{selectedStudent.name}</h1>
              <div className="flex items-center gap-4 text-secondary text-sm mt-1">
                <span className="font-mono">{selectedStudent.usn}</span>
                <span className="h-1 w-1 bg-tertiary rounded-full"></span>
                <span>{selectedStudent.branch_code}</span>
              </div>
            </div>
          </div>
          
          <div className="card px-6 py-4 flex items-center gap-8 bg-surface-raised/30">
            <div className="text-center">
              <div className="text-micro text-tertiary uppercase font-black tracking-widest mb-1">Percentage</div>
              <div className={`text-2xl font-display ${selectedStudent.percentage >= 75 ? 'text-success-fg' : 'text-danger-fg'}`}>
                {selectedStudent.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="w-px h-10 bg-[#ffffff08]"></div>
            <div className="text-center">
              <div className="text-micro text-tertiary uppercase font-black tracking-widest mb-1">Present</div>
              <div className="text-2xl font-display text-primary">{selectedStudent.presentCount}/{sessions.length}</div>
            </div>
          </div>
        </header>

        <div className="card overflow-hidden">
          <div className="p-6 border-b border-[#ffffff05] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-h2 font-display text-primary text-lg">Attendance Timeline</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={14} />
                <input 
                  type="text" 
                  placeholder="Filter sessions..." 
                  className="input pl-10 h-9 text-xs w-48 bg-[#ffffff03]"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={handleExport}
                className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[#6366F1] hover:text-white transition-all"
              >
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#ffffff02] text-micro text-tertiary uppercase tracking-widest font-black">
                  <th className="px-8 py-4 border-b border-[#ffffff05]">Date</th>
                  <th className="px-8 py-4 border-b border-[#ffffff05]">Session Topic</th>
                  <th className="px-8 py-4 border-b border-[#ffffff05] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff03]">
                {filteredDetails.length > 0 ? (
                  filteredDetails.map((record, i) => (
                    <tr key={i} className="hover:bg-[#ffffff02] transition-colors">
                      <td className="px-8 py-4 text-sm font-medium text-primary">
                        {new Date(record.sessions.date).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-sm text-secondary">{record.sessions.topic}</td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            record.present 
                              ? 'bg-success-bg text-success-fg border-success-border' 
                              : 'bg-danger-bg text-danger-fg border-danger-border'
                          }`}>
                            {record.present ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-8 py-12 text-center text-secondary italic">No records matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1 select-none cursor-default">
          <h1 className="text-display-sm text-primary font-display">Student Records</h1>
          <p className="text-secondary">Comprehensive analytics of the current cohort.</p>
        </div>
        
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={16} />
          <input 
            type="text" 
            placeholder="Filter students..." 
            className="input h-10 py-0 text-sm"
            style={{ paddingLeft: '3.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#ffffff02] text-micro text-tertiary uppercase tracking-widest font-black">
                <th className="px-8 py-4 border-b border-[#ffffff05]">Student</th>
                <th className="px-8 py-4 border-b border-[#ffffff05]">USN</th>
                <th className="px-8 py-4 border-b border-[#ffffff05]">Avg. Attendance</th>
                <th className="px-8 py-4 border-b border-[#ffffff05]">Status</th>
                <th className="px-8 py-4 border-b border-[#ffffff05] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ffffff03]">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="group hover:bg-[#ffffff02] transition-all duration-300">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-surface-raised flex items-center justify-center text-xs font-bold text-secondary border border-[#ffffff05] group-hover:border-[#6366F140] transition-colors">
                          {s.name.charAt(0)}
                        </div>
                        <div className="text-sm font-bold text-primary group-hover:text-[#6366F1] transition-colors">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm font-mono text-secondary">{s.usn}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-[#ffffff05] rounded-full overflow-hidden border border-[#ffffff05]">
                          <div 
                            className={`h-full transition-all duration-1000 ${s.percentage >= 75 ? 'bg-success-fg shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-danger-fg shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}
                            style={{ width: `${s.percentage}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${s.percentage >= 75 ? 'text-success-fg' : 'text-danger-fg'}`}>
                          {s.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      {s.percentage >= 75 ? (
                        <span className="pill pill-success text-[9px] font-black tracking-widest uppercase">Eligible</span>
                      ) : (
                        <span className="pill pill-danger text-[9px] font-black tracking-widest uppercase">Shortage</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => viewStudentDetails(s)}
                        className="p-2 rounded-lg bg-surface-raised text-tertiary hover:text-white hover:bg-[#6366F1] transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-secondary italic">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
