import { useState, useEffect } from 'react';
import { supabase, fetchAllAttendance } from '../../lib/supabase';
import { 
  Search, Plus, Calendar as CalendarIcon, BookOpen, UserCheck, 
  ChevronRight, ArrowLeft, X, History,
  Save, LayoutGrid, List,
  ChevronLeft, MoreVertical, Edit3, Trash
} from 'lucide-react';

export default function MarkAttendance() {
  const [view, setView] = useState('hub'); 
  const [showModal, setShowModal] = useState(false);
  const [hubLayout, setHubLayout] = useState('grid');
  
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [activeSession, setActiveSession] = useState({
    date: new Date().toISOString().split('T')[0],
    topic: '',
    id: null,
    session_type: 'offline',
    duration_hours: 2.0
  });
  
  const [openActionId, setOpenActionId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [markingLayout, setMarkingLayout] = useState('grid');
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchHubData();
  }, []);

  async function fetchHubData() {
    try {
      setLoading(true);
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setTotalStudents(count || 0);

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      const attendanceData = await fetchAllAttendance('session_id, present');

      const enrichedSessions = sessionData?.map(s => {
        const sessionAttendance = attendanceData?.filter(a => a.session_id === s.id && a.present) || [];
        return {
          ...s,
          presentCount: sessionAttendance.length
        };
      }) || [];

      setSessions(enrichedSessions);
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
          id: sessionObj.id,
          session_type: sessionObj.session_type || 'offline',
          duration_hours: sessionObj.duration_hours || 2.0
        });
        const { data: attData } = await supabase.from('attendance').select('student_id, present').eq('session_id', sessionObj.id);
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
      console.error('Error starting marking:', err);
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
        session_type: activeSession.session_type,
        duration_hours: activeSession.duration_hours
      };

      if (!sessionId) {
        const { data: newS, error: sErr } = await supabase.from('sessions').insert([sessionPayload]).select().single();
        if (sErr) throw sErr;
        sessionId = newS.id;
      } else {
        const { error: sErr } = await supabase.from('sessions').update(sessionPayload).eq('id', sessionId);
        if (sErr) throw sErr;
      }

      const attendancePayload = students.map(s => ({
        student_id: s.id,
        session_id: sessionId,
        present: attendance[s.id] ?? false,
        marked_by: 'mentor'
      }));

      const { error: aErr } = await supabase.from('attendance').upsert(attendancePayload, { onConflict: 'student_id,session_id' });
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

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this session? All attendance records for this session will be permanently removed.')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      fetchHubData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (s) => {
    setActiveSession({
      id: s.id,
      date: s.date,
      topic: s.topic,
      session_type: s.session_type || 'offline',
      duration_hours: s.duration_hours || 2.0
    });
    setShowModal(true);
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-24 sm:h-32 border border-[#ffffff03] bg-[#ffffff01]"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = sessions.filter(s => s.date === dateString);
      const isToday = new Date().toISOString().split('T')[0] === dateString;

      days.push(
        <div key={d} className={`min-h-[140px] border border-[#ffffff05] relative flex flex-col group transition-all duration-500 hover:bg-[#6366F105] ${isToday ? 'bg-[#6366F108]' : ''}`}>
          <span className={`absolute top-3 left-3 text-[12px] font-black z-20 transition-transform group-hover:scale-110 ${isToday ? 'bg-[#6366F1] text-white px-2 py-0.5 rounded-md shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-tertiary'}`}>{d}</span>
          <div className="flex-1 flex flex-col gap-2 p-2 mt-10">
            {daySessions.map(s => {
              const presentCount = s.presentCount || 0;
              const percent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
              return (
                <button 
                  key={s.id}
                  onClick={() => startMarking(s)}
                  className="w-full bg-[#6366F115] hover:bg-[#6366F1] text-[#6366F1] hover:text-white p-2.5 rounded-xl text-left transition-all overflow-hidden border border-[#6366F130] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] flex flex-col gap-1.5 group/session relative"
                >
                  <div className="text-[11px] font-black leading-tight line-clamp-2">{s.topic}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] opacity-80 font-black uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded">{s.session_type}</span>
                    <span className={`text-[9px] font-black ${percent >= 75 ? 'text-success-fg group-hover/session:text-white' : 'text-danger-fg group-hover/session:text-white'}`}>{percent}%</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/session:opacity-100 transition-opacity"></div>
                </button>
              );
            })}
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

  const filteredSessions = sessions;

  if (loading && view === 'hub') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-secondary text-sm font-medium animate-pulse">Calculating attendance statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">
      {view === 'hub' && (
        <>
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 select-none cursor-default">
              <h1 className="text-display-sm text-primary font-display">Attendance Sessions</h1>
              <p className="text-secondary">Track and manage daily student participation.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex p-1 bg-[#ffffff05] rounded-xl border border-[#ffffff10] shadow-inner">
                {[
                  { id: 'grid', label: 'Grid', icon: LayoutGrid },
                  { id: 'table', label: 'List', icon: List },
                  { id: 'calendar', label: 'Calendar', icon: CalendarIcon }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setHubLayout(item.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                      hubLayout === item.id 
                        ? 'bg-[#6366F1] text-white shadow-[0_4px_15px_rgba(99,102,241,0.4)]' 
                        : 'text-tertiary hover:text-secondary hover:bg-[#ffffff05]'
                    }`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => {
                  setActiveSession({
                    date: new Date().toISOString().split('T')[0],
                    topic: '',
                    id: null,
                    session_type: 'offline',
                    duration_hours: 2.0
                  });
                  setShowModal(true);
                }}
                className="btn-primary px-6 py-3 flex items-center gap-2 shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transition-all text-sm font-bold"
              >
                <Plus size={18} /> New Session
              </button>
            </div>
          </header>

          <div className="animate-in fade-in duration-700">
            {hubLayout === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((s) => {
                    const presentCount = s.presentCount || 0;
                    const percent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
                    const isOpen = openActionId === s.id;

                    return (
                      <div 
                        key={s.id} 
                        onClick={() => startMarking(s)}
                        className="card p-6 group hover:border-[#6366F160] hover:bg-[#6366F105] transition-all relative overflow-hidden flex flex-col cursor-pointer hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-3 relative z-10">
                          <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-black tracking-widest"><CalendarIcon size={12} /> {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setOpenActionId(isOpen ? null : s.id)}
                              className={`p-1.5 rounded-full transition-colors ${isOpen ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:bg-[#ffffff10] hover:text-white'}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {isOpen && (
                              <div className="absolute right-0 top-full mt-2 w-40 bg-[#16161F] border border-[#ffffff10] rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                <button 
                                  onClick={() => { openEditModal(s); setOpenActionId(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-secondary hover:text-white hover:bg-[#ffffff05] transition-colors"
                                >
                                  <Edit3 size={14} /> Edit Session
                                </button>
                                <button 
                                  onClick={() => { handleDeleteSession(s.id); setOpenActionId(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-danger-fg hover:bg-danger-bg/20 transition-colors"
                                >
                                  <Trash size={14} /> Delete Session
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-primary group-hover:text-[#6366F1] transition-colors mb-2 line-clamp-2 select-none cursor-default">{s.topic}</h3>
                        <div className="flex items-center gap-3 mb-4 select-none">
                          <span className="px-2 py-0.5 rounded bg-[#ffffff05] text-[9px] font-black uppercase text-tertiary border border-[#ffffff10]">{s.session_type}</span>
                          <span className="px-2 py-0.5 rounded bg-[#ffffff05] text-[9px] font-black uppercase text-tertiary border border-[#ffffff10]">{s.duration_hours}h</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#ffffff05] select-none">
                          <div className="flex items-center gap-1.5"><UserCheck size={14} className="text-secondary" /><span className="text-xs font-bold text-secondary">{presentCount} / {totalStudents}</span></div>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${percent >= 75 ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{percent}% Attendance</div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#6366F1] rounded-full blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      </div>
                    );
                  })
                ) : <EmptyHub /> }
              </div>
            )}

            {hubLayout === 'table' && (
              <div className="card overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#ffffff02] border-b border-[#ffffff05]">
                    <tr className="text-micro text-tertiary uppercase font-black tracking-widest">
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4">Topic</th>
                      <th className="px-8 py-4">Attendance</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffffff03]">
                    {filteredSessions.map(s => {
                      const presentCount = s.presentCount || 0;
                      const percent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
                      const isOpen = openActionId === s.id;

                      return (
                        <tr 
                          key={s.id} 
                          onClick={() => startMarking(s)}
                          className="group hover:bg-[#ffffff02] transition-colors cursor-pointer"
                        >
                          <td className="px-8 py-4 text-sm font-medium text-primary">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="px-8 py-4 text-sm text-secondary group-hover:text-[#6366F1] transition-colors">
                            <div className="flex flex-col">
                              <span>{s.topic}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black uppercase text-tertiary bg-[#ffffff05] px-1 rounded border border-[#ffffff10]">{s.session_type}</span>
                                <span className="text-[8px] font-black uppercase text-tertiary bg-[#ffffff05] px-1 rounded border border-[#ffffff10]">{s.duration_hours}h</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-[#ffffff05] rounded-full overflow-hidden"><div className={`h-full rounded-full ${percent >= 75 ? 'bg-success-fg' : 'bg-danger-fg'}`} style={{ width: `${percent}%` }}></div></div>
                              <span className="text-xs font-bold text-primary">{presentCount}/{totalStudents}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end relative">
                              <button 
                                onClick={() => setOpenActionId(isOpen ? null : s.id)}
                                className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:bg-[#ffffff10] hover:text-white'}`}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {isOpen && (
                                <div className="absolute right-0 top-full mt-2 w-40 bg-[#16161F] border border-[#ffffff10] rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                                  <button 
                                    onClick={() => { openEditModal(s); setOpenActionId(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-secondary hover:text-white hover:bg-[#ffffff05] transition-colors"
                                  >
                                    <Edit3 size={14} /> Edit Session
                                  </button>
                                  <button 
                                    onClick={() => { handleDeleteSession(s.id); setOpenActionId(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-danger-fg hover:bg-danger-bg/20 transition-colors"
                                  >
                                    <Trash size={14} /> Delete Session
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {hubLayout === 'calendar' && (
              <div className="card overflow-hidden border-[#ffffff10]">
                <div className="p-6 border-b border-[#ffffff05] flex items-center justify-between bg-[#ffffff02]">
                  <h3 className="text-xl font-display text-primary">{currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[#ffffff05] text-tertiary hover:text-white transition-all border border-[#ffffff05]"><ChevronLeft size={20} /></button>
                    <button onClick={() => changeMonth(1)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[#ffffff05] text-tertiary hover:text-white transition-all border border-[#ffffff05]"><ChevronRight size={20} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-micro text-tertiary uppercase font-black tracking-[0.2em] bg-[#ffffff02] py-4 border-b border-[#ffffff05]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">{renderCalendar()}</div>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'marking' && (
        <div className="animate-in slide-in-from-right-8 duration-700">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
              <button onClick={() => setView('hub')} className="h-12 w-12 rounded-full border border-[#ffffff10] flex items-center justify-center text-secondary hover:text-white hover:bg-[#ffffff05] transition-all"><ArrowLeft size={20} /></button>
              <div className="select-none cursor-default">
                <h1 className="text-display-sm text-primary font-display">{activeSession.topic}</h1>
                <div className="flex items-center gap-3 text-secondary text-sm mt-1"><CalendarIcon size={14} /> {new Date(activeSession.date).toLocaleDateString()}<span className="h-1 w-1 bg-tertiary rounded-full"></span><span>{students.length} Students</span></div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative max-w-md w-full hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" size={16} />
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  className="w-full bg-[#0E0E14] border border-[#ffffff08] rounded-full py-1.5 pl-10 pr-4 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#6366F140] transition-all"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex p-1 bg-[#ffffff05] rounded-lg border border-[#ffffff10]">
                <button onClick={() => setMarkingLayout('grid')} className={`p-2 rounded-md transition-all ${markingLayout === 'grid' ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:text-secondary'}`}><LayoutGrid size={18} /></button>
                <button onClick={() => setMarkingLayout('table')} className={`p-2 rounded-md transition-all ${markingLayout === 'table' ? 'bg-[#6366F1] text-white' : 'text-tertiary hover:text-secondary'}`}><List size={18} /></button>
              </div>
            </div>
          </header>

          {markingLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredMarkingStudents.map(s => (
                <button key={s.id} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className={`relative p-5 rounded-2xl border transition-all duration-300 text-center flex flex-col items-center gap-4 group ${attendance[s.id] ? 'bg-success-bg/10 border-success-border/40 hover:border-success-border shadow-[0_8px_30px_rgba(16,185,129,0.1)]' : 'bg-danger-bg/15 border-danger-border/40 hover:border-danger-border shadow-[0_8px_30px_rgba(244,63,94,0.1)]'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black transition-all ${attendance[s.id] ? 'bg-success-fg text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-danger-fg text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'}`}>
                    {attendance[s.id] ? <UserCheck size={24} /> : <X size={24} />}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-primary truncate w-full max-w-[120px]">{s.name}</div>
                    <div className="text-[10px] text-tertiary font-mono uppercase tracking-tighter opacity-60">{s.usn}</div>
                  </div>
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${attendance[s.id] ? 'bg-success-fg text-white shadow-lg' : 'bg-danger-fg text-white shadow-lg'}`}>
                    {attendance[s.id] ? 'Present' : 'Absent'}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#ffffff02] border-b border-[#ffffff05]">
                  <tr className="text-micro text-tertiary uppercase font-black tracking-widest"><th className="px-8 py-4">Student</th><th className="px-8 py-4">USN</th><th className="px-8 py-4 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff03]">
                  {filteredMarkingStudents.map(s => (
                    <tr key={s.id} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className="group cursor-pointer hover:bg-[#ffffff02] transition-colors">
                      <td className="px-8 py-4"><div className="flex items-center gap-3"><div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${attendance[s.id] ? 'bg-success-fg' : 'bg-danger-fg'}`}>{s.name.charAt(0)}</div><span className="text-sm font-medium text-primary">{s.name}</span></div></td>
                      <td className="px-8 py-4 text-sm font-mono text-secondary">{s.usn}</td>
                      <td className="px-8 py-4 text-center"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${attendance[s.id] ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{attendance[s.id] ? 'Present' : 'Absent'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
             <div className="bg-[#0B0B11]/90 backdrop-blur border border-[#ffffff10] px-6 py-3 rounded-full hidden md:flex items-center gap-6 shadow-2xl">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success-fg"></div><span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => v).length} Present</span></div>
               <div className="w-px h-4 bg-[#ffffff10]"></div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-danger-fg"></div><span className="text-xs text-secondary font-bold">{Object.values(attendance).filter(v => !v).length} Absent</span></div>
             </div>
             <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-10 py-4 bg-[#6366F1] text-white rounded-full font-bold shadow-[0_10px_40px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Save Attendance</>}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000bb] backdrop-blur-sm animate-in fade-in duration-300">
          <div className="card w-full max-w-lg p-8 animate-in zoom-in duration-300 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-tertiary hover:text-white transition-colors"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#6366F110] border border-[#6366F120] flex items-center justify-center text-[#6366F1]"><Plus size={24} /></div>
              <div><h3 className="text-2xl font-display text-primary">{activeSession.id ? 'Edit Session' : 'New Session'}</h3><p className="text-secondary text-sm">{activeSession.id ? 'Modify session details and settings.' : 'Prepare to mark records for a new session.'}</p></div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><CalendarIcon size={12} /> Date</label><input type="date" className="input h-12 bg-void" value={activeSession.date} onChange={(e) => setActiveSession({...activeSession, date: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><BookOpen size={12} /> Mode</label>
                  <select className="input h-12 bg-void" value={activeSession.session_type} onChange={(e) => setActiveSession({...activeSession, session_type: e.target.value})}>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="recording">Recording Only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><BookOpen size={12} /> Topic</label><input type="text" placeholder="Topic..." className="input h-12 bg-void" value={activeSession.topic} onChange={(e) => setActiveSession({...activeSession, topic: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-micro text-tertiary uppercase font-black tracking-widest flex items-center gap-2"><Plus size={12} /> Duration (h)</label><input type="number" step="0.5" className="input h-12 bg-void" value={activeSession.duration_hours} onChange={(e) => setActiveSession({...activeSession, duration_hours: parseFloat(e.target.value)})} /></div>
              </div>
              <div className="pt-4 flex gap-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4 font-bold text-sm">Cancel</button>
                <button 
                  onClick={async () => {
                    if (activeSession.id) {
                      // Just save metadata if editing
                      await handleSave();
                      setShowModal(false);
                    } else {
                      // Start marking if new
                      startMarking();
                    }
                  }} 
                  className="btn-primary flex-1 py-4 font-bold text-sm"
                >
                  {activeSession.id ? 'Save Changes' : 'Start Marking'}
                </button>
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
      <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-tertiary opacity-30"><History size={32} /></div>
      <div><h3 className="text-xl font-bold text-primary">No sessions yet</h3><p className="text-secondary max-w-xs">Create your first session to start marking attendance.</p></div>
    </div>
  );
}
