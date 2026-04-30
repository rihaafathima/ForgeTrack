import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Plus, Calendar as CalendarIcon, BookOpen, UserCheck, 
  ChevronRight, ArrowLeft, X, History,
  CheckCircle2, AlertCircle, Save, LayoutGrid, List,
  ChevronLeft
} from 'lucide-react';

export default function MarkAttendance() {
  // Views: 'hub' (session history), 'marking' (the grid/list view)
  const [view, setView] = useState('hub'); 
  const [showModal, setShowModal] = useState(false);
  
  // Hub Layout: 'grid', 'table', 'calendar'
  const [hubLayout, setHubLayout] = useState('grid');
  
  // Data State
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Active Session State
  const [activeSession, setActiveSession] = useState({
    date: new Date().toISOString().split('T')[0],
    topic: '',
    id: null
  });

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [markingLayout, setMarkingLayout] = useState('grid'); // 'grid' or 'table' inside marking view

  useEffect(() => {
    fetchHubData();
  }, []);

  async function fetchHubData() {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      setSessions(sessionData || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function startMarking(sessionObj = null) {
    try {
      setLoading(true);
      setSearchTerm('');
      
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setStudents(studentData || []);

      if (sessionObj) {
        setActiveSession({
          date: sessionObj.date,
          topic: sessionObj.topic,
          id: sessionObj.id
        });

        const { data: attData } = await supabase
          .from('attendance')
          .select('student_id, present')
          .eq('session_id', sessionObj.id);

        const attMap = {};
        attData?.forEach(a => attMap[a.student_id] = a.present);
        setAttendance(attMap);
      } else {
        const attMap = {};
        studentData?.forEach(s => attMap[s.id] = true);
        setAttendance(attMap);
      }
      
      setView('marking');
      setShowModal(false);
    } catch (err) {
      console.error('Error starting marking session:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!activeSession.topic) return alert('Session topic is required');

    try {
      setSaving(true);
      let sessionId = activeSession.id;

      const sessionPayload = {
        date: activeSession.date,
        topic: activeSession.topic,
        month_number: new Date(activeSession.date).getMonth() + 1,
        session_type: 'offline'
      };

      if (!sessionId) {
        const { data: newS, error: sErr } = await supabase
          .from('sessions')
          .insert([sessionPayload])
          .select().single();
        if (sErr) throw sErr;
        sessionId = newS.id;
      } else {
        const { error: sErr } = await supabase
          .from('sessions')
          .update(sessionPayload)
          .eq('id', sessionId);
        if (sErr) throw sErr;
      }

      const attendancePayload = students.map(s => ({
        student_id: s.id,
        session_id: sessionId,
        present: attendance[s.id] ?? false,
        marked_by: 'mentor'
      }));

      const { error: aErr } = await supabase
        .from('attendance')
        .upsert(attendancePayload, { onConflict: 'student_id,session_id' });

      if (aErr) throw aErr;

      setView('hub');
      fetchHubData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-24 sm:h-32 border border-[#ffffff03] bg-[#ffffff01]"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = sessions.filter(s => s.date === dateString);
      const isToday = new Date().toISOString().split('T')[0] === dateString;

      days.push(
        <div key={d} className={`h-24 sm:h-32 border border-[#ffffff05] p-2 flex flex-col gap-1 transition-colors hover:bg-[#ffffff02] ${isToday ? 'bg-[#6366F105]' : ''}`}>
          <span className={`text-xs font-bold ${isToday ? 'text-[#6366F1]' : 'text-tertiary'}`}>{d}</span>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {daySessions.map(s => (
              <button 
                key={s.id}
                onClick={() => startMarking(s)}
                className="text-[10px] bg-[#6366F120] border border-[#6366F130] text-[#6366F1] px-1.5 py-1 rounded truncate text-left font-bold hover:bg-[#6366F1] hover:text-white transition-all"
              >
                {s.topic}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const filteredMarkingStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && view === 'hub') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-secondary text-sm font-medium animate-pulse">Synchronizing sessions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">
      
      {/* --- HUB VIEW --- */}
      {view === 'hub' && (
        <>
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-display-sm text-primary font-display">Attendance Sessions</h1>
              <p className="text-secondary">Track and manage daily student participation.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex p-1 bg-[#ffffff05] rounded-lg border border-[#ffffff10]">
                <button 
                  onClick={() => setHubLayout('grid')}
                  className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${hubLayout === 'grid' ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:text-secondary'}`}
                >
                  <LayoutGrid size={16} /> Grid
                </button>
                <button 
                  onClick={() => setHubLayout('table')}
                  className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${hubLayout === 'table' ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:text-secondary'}`}
                >
                  <List size={16} /> List
                </button>
                <button 
                  onClick={() => setHubLayout('calendar')}
                  className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${hubLayout === 'calendar' ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:text-secondary'}`}
                >
                  <CalendarIcon size={16} /> Calendar
                </button>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 transition-all text-sm"
              >
                <Plus size={18} /> New Session
              </button>
            </div>
          </header>

          {/* Hub Content Switcher */}
          <div className="animate-in fade-in duration-700">
            {hubLayout === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <button 
                      key={s.id}
                      onClick={() => startMarking(s)}
                      className="card p-6 text-left group hover:border-[#6366F140] hover:bg-[#6366F105] transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={18} className="text-[#6366F1]" />
                      </div>
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-black tracking-widest mb-3">
                          <CalendarIcon size={12} /> {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <h3 className="text-lg font-bold text-primary group-hover:text-[#6366F1] transition-colors mb-4 line-clamp-2 flex-1">
                          {s.topic}
                        </h3>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#ffffff05]">
                          <span className="text-[10px] bg-[#ffffff05] px-2 py-1 rounded text-tertiary uppercase font-black tracking-tighter">ID: {s.id}</span>
                          <div className="flex items-center gap-1 text-xs text-success-fg font-bold">
                            <UserCheck size={14} /> View
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : <EmptyHub /> }
              </div>
            )}

            {hubLayout === 'table' && (
              <div className="card overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#ffffff02] border-b border-[#ffffff05]">
                    <tr className="text-micro text-tertiary uppercase font-black tracking-widest">
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4">Session Topic</th>
                      <th className="px-8 py-4">Type</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffffff03]">
                    {sessions.map(s => (
                      <tr key={s.id} className="group hover:bg-[#ffffff02] transition-colors">
                        <td className="px-8 py-4 text-sm font-medium text-primary">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="px-8 py-4 text-sm text-secondary group-hover:text-[#6366F1] transition-colors">{s.topic}</td>
                        <td className="px-8 py-4">
                          <span className="text-[10px] bg-[#ffffff05] px-2 py-1 rounded text-tertiary uppercase font-black tracking-widest">{s.session_type}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button onClick={() => startMarking(s)} className="text-accent-glow text-xs font-bold hover:underline">Mark Attendance</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hubLayout === 'calendar' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[#ffffff05] flex items-center justify-between bg-[#ffffff02]">
                  <h3 className="text-lg font-display text-primary">
                    {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-[#ffffff05] text-tertiary hover:text-white"><ChevronLeft size={20} /></button>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-[#ffffff05] text-tertiary hover:text-white"><ChevronRight size={20} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-micro text-tertiary uppercase font-black tracking-widest bg-[#ffffff02]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-3 border-b border-[#ffffff05]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {renderCalendar()}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MARKING VIEW --- */}
      {view === 'marking' && (
        <div className="animate-in slide-in-from-right-8 duration-700">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView('hub')}
                className="h-12 w-12 rounded-full border border-[#ffffff10] flex items-center justify-center text-secondary hover:text-white hover:bg-[#ffffff05] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-display-sm text-primary font-display">{activeSession.topic}</h1>
                <div className="flex items-center gap-3 text-secondary text-sm mt-1">
                  <CalendarIcon size={14} /> {new Date(activeSession.date).toLocaleDateString()}
                  <span className="h-1 w-1 bg-tertiary rounded-full"></span>
                  <span>{students.length} Total Students</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  className="input pl-12 h-12 text-sm bg-void"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex p-1 bg-[#ffffff05] rounded-lg border border-[#ffffff10]">
                <button 
                  onClick={() => setMarkingLayout('grid')}
                  className={`p-2 rounded-md transition-all ${markingLayout === 'grid' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-tertiary hover:text-secondary'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setMarkingLayout('table')}
                  className={`p-2 rounded-md transition-all ${markingLayout === 'table' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-tertiary hover:text-secondary'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </header>

          {markingLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredMarkingStudents.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 text-center flex flex-col items-center gap-3 group ${
                    attendance[s.id] 
                      ? 'bg-success-bg/10 border-success-border/30 hover:border-success-border' 
                      : 'bg-danger-bg/10 border-danger-border/30 hover:border-danger-border'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                    attendance[s.id] 
                      ? 'bg-success-fg text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                      : 'bg-danger-fg text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  }`}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-primary truncate w-full max-w-[100px]">{s.name}</div>
                    <div className="text-[9px] text-tertiary font-mono uppercase tracking-tighter opacity-60">{s.usn}</div>
                  </div>
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${attendance[s.id] ? 'bg-success-fg animate-pulse' : 'bg-danger-fg'}`}></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#ffffff02] border-b border-[#ffffff05]">
                  <tr className="text-micro text-tertiary uppercase font-black tracking-[0.2em]">
                    <th className="px-8 py-4">Student</th>
                    <th className="px-8 py-4">USN</th>
                    <th className="px-8 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff03]">
                  {filteredMarkingStudents.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="group cursor-pointer hover:bg-[#ffffff02] transition-colors"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${attendance[s.id] ? 'bg-success-fg' : 'bg-danger-fg'}`}>
                            {s.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-primary">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm font-mono text-secondary">{s.usn}</td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            attendance[s.id] ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'
                          }`}>
                            {attendance[s.id] ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
             <div className="bg-[#0B0B11]/90 backdrop-blur border border-[#ffffff10] px-6 py-3 rounded-full hidden md:flex items-center gap-6 shadow-2xl">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success-fg"></div>
                 <span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => v).length} Present</span>
               </div>
               <div className="w-px h-4 bg-[#ffffff10]"></div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-danger-fg"></div>
                 <span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => !v).length} Absent</span>
               </div>
             </div>
             <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-10 py-4 bg-[#6366F1] text-white rounded-full font-bold shadow-[0_10px_40px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Save Attendance</>}
            </button>
          </div>
        </div>
      )}

      {/* --- NEW SESSION MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000bb] backdrop-blur-sm animate-in fade-in duration-300">
          <div className="card w-full max-w-lg p-8 animate-in zoom-in duration-300 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-tertiary hover:text-white transition-colors"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#6366F110] border border-[#6366F120] flex items-center justify-center text-[#6366F1]"><Plus size={24} /></div>
              <div>
                <h3 className="text-2xl font-display text-primary">New Attendance</h3>
                <p className="text-secondary text-sm">Prepare to mark records for a new session.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><CalendarIcon size={12} /> Date</label>
                <input type="date" className="input h-12 bg-void" value={activeSession.date} onChange={(e) => setActiveSession({...activeSession, date: e.target.value, id: null})} />
              </div>
              <div className="space-y-2">
                <label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><BookOpen size={12} /> Topic</label>
                <input type="text" placeholder="Topic..." className="input h-12 bg-void" value={activeSession.topic} onChange={(e) => setActiveSession({...activeSession, topic: e.target.value, id: null})} />
              </div>
              <div className="pt-4 flex gap-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4 font-bold">Cancel</button>
                <button onClick={() => startMarking()} className="btn-primary flex-1 py-4 font-bold">Start Marking</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyHub() {
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center gap-4 bg-void/50 rounded-3xl border border-[#ffffff05]">
      <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-tertiary opacity-30">
        <History size={32} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-primary">No sessions yet</h3>
        <p className="text-secondary max-w-xs">Create your first session to start marking attendance.</p>
      </div>
    </div>
  );
}

      {/* --- MARKING VIEW --- */}
      {view === 'marking' && (
        <div className="animate-in slide-in-from-right-8 duration-700">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView('hub')}
                className="h-12 w-12 rounded-full border border-[#ffffff10] flex items-center justify-center text-secondary hover:text-white hover:bg-[#ffffff05] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-display-sm text-primary font-display">{activeSession.topic}</h1>
                <div className="flex items-center gap-3 text-secondary text-sm mt-1">
                  <Calendar size={14} /> {new Date(activeSession.date).toLocaleDateString()}
                  <span className="h-1 w-1 bg-tertiary rounded-full"></span>
                  <span>{students.length} Total Students</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  className="input pl-12 h-12 text-sm bg-void"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex p-1 bg-[#ffffff05] rounded-lg border border-[#ffffff10]">
                <button 
                  onClick={() => setLayout('grid')}
                  className={`p-2 rounded-md transition-all ${layout === 'grid' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-tertiary hover:text-secondary'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setLayout('table')}
                  className={`p-2 rounded-md transition-all ${layout === 'table' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-tertiary hover:text-secondary'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </header>

          {layout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredStudents.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 text-center flex flex-col items-center gap-3 group ${
                    attendance[s.id] 
                      ? 'bg-success-bg/10 border-success-border/30 hover:border-success-border' 
                      : 'bg-danger-bg/10 border-danger-border/30 hover:border-danger-border'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                    attendance[s.id] 
                      ? 'bg-success-fg text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                      : 'bg-danger-fg text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  }`}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-primary truncate w-full max-w-[100px]">{s.name}</div>
                    <div className="text-[9px] text-tertiary font-mono uppercase tracking-tighter opacity-60">{s.usn}</div>
                  </div>
                  
                  {/* Visual Status Indicator */}
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${attendance[s.id] ? 'bg-success-fg animate-pulse' : 'bg-danger-fg'}`}></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#ffffff02] border-b border-[#ffffff05]">
                  <tr className="text-micro text-tertiary uppercase font-black tracking-[0.2em]">
                    <th className="px-8 py-4">Student</th>
                    <th className="px-8 py-4">USN</th>
                    <th className="px-8 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff03]">
                  {filteredStudents.map(s => (
                    <tr 
                      key={s.id} 
                      onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="group cursor-pointer hover:bg-[#ffffff02] transition-colors"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${attendance[s.id] ? 'bg-success-fg' : 'bg-danger-fg'}`}>
                            {s.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-primary">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm font-mono text-secondary">{s.usn}</td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            attendance[s.id] ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'
                          }`}>
                            {attendance[s.id] ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
             <div className="bg-[#0B0B11]/90 backdrop-blur border border-[#ffffff10] px-6 py-3 rounded-full hidden md:flex items-center gap-6 shadow-2xl">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success-fg"></div>
                 <span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => v).length} Present</span>
               </div>
               <div className="w-px h-4 bg-[#ffffff10]"></div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-danger-fg"></div>
                 <span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => !v).length} Absent</span>
               </div>
             </div>
             
             <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-10 py-4 bg-[#6366F1] text-white rounded-full font-bold shadow-[0_10px_40px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Save Attendance</>}
            </button>
          </div>
        </div>
      )}

      {/* --- NEW SESSION MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000bb] backdrop-blur-sm animate-in fade-in duration-300">
          <div className="card w-full max-w-lg p-8 animate-in zoom-in duration-300 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-tertiary hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#6366F110] border border-[#6366F120] flex items-center justify-center text-[#6366F1]">
                <Plus size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-display text-primary">New Attendance</h3>
                <p className="text-secondary text-sm">Prepare to mark records for a new session.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Session Date
                </label>
                <input 
                  type="date" 
                  className="input h-12 bg-void"
                  value={activeSession.date}
                  onChange={(e) => setActiveSession({...activeSession, date: e.target.value, id: null})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2">
                  <BookOpen size={12} /> Topic / Subject
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Computer Vision Basics"
                  className="input h-12 bg-void"
                  value={activeSession.topic}
                  onChange={(e) => setActiveSession({...activeSession, topic: e.target.value, id: null})}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1 py-4 font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => startMarking()}
                  className="btn-primary flex-1 py-4 font-bold"
                >
                  Start Marking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
