import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, CheckCircle, TrendingUp, ArrowRight, BookOpen } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    avgAttendance: 0,
    engagement: 0,
    courseProgress: 0,
    nextSession: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Fetch total students
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        // Fetch sessions
        const { data: sessions } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: false });
        
        // Calculate average attendance
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('present');
        
        let avg = 0;
        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.present).length;
          avg = Math.round((presentCount / attendanceData.length) * 100);
        }

        // Calculate engagement (simple metric: attendance rate + some factor or just attendance for now)
        // For now, let's keep it 0 if no data, or a placeholder if data exists
        let engagement = 0;
        if (sessions && sessions.length > 0) {
          engagement = Math.min(100, Math.round(avg * 1.1)); // Placeholder logic
        }

        // Course progress (sessions held vs expected sessions, e.g., 30)
        const expectedSessions = 30;
        const progress = sessions ? Math.round((sessions.length / expectedSessions) * 100) : 0;
        
        setStats({
          totalStudents: studentCount || 0,
          activeSessions: sessions?.length || 0,
          avgAttendance: avg,
          engagement: engagement,
          courseProgress: progress,
          nextSession: sessions?.[0] || null
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-secondary text-sm font-medium animate-pulse">Synchronizing environment...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-accent-glow', bg: 'bg-accent-glow-soft' },
    { label: 'Sessions Held', value: stats.activeSessions, icon: Calendar, color: 'text-info-fg', bg: 'bg-info-bg' },
    { label: 'Avg. Attendance', value: `${stats.avgAttendance}%`, icon: CheckCircle, color: 'text-success-fg', bg: 'bg-success-bg' },
    { label: 'Engagement', value: `${stats.engagement > 0 ? '+' : ''}${stats.engagement}%`, icon: TrendingUp, color: 'text-warning-fg', bg: 'bg-warning-bg' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header>
        <h1 className="text-display-sm text-primary mb-2 font-display">Program Overview</h1>
        <p className="text-secondary text-lg">Tracking progress for The Forge AI-ML Engineering Bootcamp.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="card p-6 flex flex-col gap-4 group hover:border-strong transition-all duration-300 cursor-default">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg shadow-black/20`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-micro text-tertiary uppercase mb-1 font-bold tracking-widest">{stat.label}</div>
              <div className="text-display-md text-primary">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-display text-primary">Recent Sessions</h2>
            <Link to="/history" className="text-body-sm text-accent-glow hover:text-white transition-colors flex items-center gap-1 group font-semibold">
              View all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {stats.activeSessions > 0 ? (
              <div className="card p-6 border-dashed border-[#ffffff10] flex items-center justify-center text-secondary italic text-sm">
                Session insights will appear here as more data is collected.
              </div>
            ) : (
              <div className="card py-16 flex flex-col items-center justify-center text-center gap-4 bg-void/50">
                <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-tertiary/40 border border-[#ffffff05]">
                  <Calendar size={32} />
                </div>
                <div>
                  <div className="text-body text-primary font-bold text-lg">No sessions found</div>
                  <div className="text-body-sm text-tertiary max-w-[280px]">Begin by marking attendance or uploading a student CSV.</div>
                </div>
                <Link to="/upload" className="btn-primary mt-4 px-6 py-2.5">Get Started</Link>
              </div>
            )}
          </div>
        </div>

        {stats.activeSessions > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-1000 delay-300">
            <h2 className="text-h2 font-display text-primary">Next Milestone</h2>
            <Link to="/materials" className="block card p-6 border-accent-glow/20 bg-accent-glow/5 relative overflow-hidden group hover:border-accent-glow/40 transition-all duration-500">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <BookOpen size={120} />
              </div>
              <div className="relative z-10">
                <div className="pill pill-success mb-4 px-3 py-1 font-bold">Phase 1 Active</div>
                <div className="text-lg text-primary font-bold mb-1">Foundational Sprint</div>
                <div className="text-sm text-secondary mb-8 leading-relaxed">Complete Python and Math for ML basics. All study materials have been uploaded.</div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-micro text-tertiary uppercase font-black tracking-widest">
                    <span>Course Progress</span>
                    <span className="text-accent-glow">{stats.courseProgress}%</span>
                  </div>
                  <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-[#ffffff05]">
                    <div className="bg-accent-glow h-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${stats.courseProgress}%` }}></div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
