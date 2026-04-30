import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { LayoutDashboard, CheckSquare, Users, BookOpen, Upload, UserCheck, Calendar, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { dbUser, signOut } = useAuth();
  const role = dbUser?.role;

  const mentorNav = [
    { label: 'Overview', items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    { label: 'Activity', items: [
      { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
      { name: 'Student History', path: '/history', icon: Users },
      { name: 'Materials', path: '/materials', icon: BookOpen },
    ]},
    { label: 'Data', items: [{ name: 'Upload CSV', path: '/upload', icon: Upload }] }
  ];

  const studentNav = [
    { label: 'Overview', items: [{ name: 'My Attendance', path: '/me/attendance', icon: UserCheck }] },
    { label: 'Activity', items: [
      { name: 'Upcoming', path: '/me/upcoming', icon: Calendar },
      { name: 'Materials', path: '/me/materials', icon: BookOpen },
    ]},
  ];

  const nav = role === 'mentor' ? mentorNav : studentNav;

  return (
    <aside className="w-[260px] h-screen bg-canvas border-r border-[#ffffff05] flex flex-col shrink-0 overflow-hidden group/sidebar">
      <div className="pt-8 px-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-[#6366F1] rounded flex items-center justify-center text-[12px] font-black italic shadow-[0_0_15px_rgba(99,102,241,0.4)]">F</div>
          <h1 className="text-display-sm text-primary font-display tracking-tight leading-none">ForgeTrack</h1>
        </div>
      </div>
      
      <div className="px-8 py-6 pb-4">
        <div className="text-body text-secondary font-medium text-sm">Welcome Back,</div>
        <div className="text-body text-primary font-bold truncate">{dbUser?.display_name || 'Nischay BK'}</div>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
        <nav className="flex flex-col gap-8">
          {nav.map((section, idx) => (
            <div key={idx}>
              <div className="text-micro text-tertiary mb-4 px-4 uppercase tracking-[0.25em] font-black opacity-40">{section.label}</div>
              <div className="flex flex-col gap-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-4 rounded-xl h-12 text-sm transition-all duration-300 relative ` +
                        (isActive 
                          ? `bg-[#ffffff05] text-[#F5F5F7] border border-[#ffffff10] shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]` 
                          : `text-[#8A8A94] hover:bg-[#ffffff03] hover:text-[#F5F5F7] border border-transparent`)
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <div className="absolute left-[-1px] top-3 bottom-3 w-[2px] bg-[#6366F1] rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]"></div>}
                          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#6366F1]' : 'text-[#8A8A94] transition-colors group-hover:text-primary'} />
                          <span className={isActive ? 'font-semibold tracking-tight' : 'font-medium tracking-tight'}>{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="px-4 pb-8 mt-auto pt-4 border-t border-[#ffffff05]">
        <button 
          onClick={signOut}
          className="flex w-full items-center gap-3 px-4 rounded-xl h-12 text-sm font-medium text-[#8A8A94] hover:bg-[#F43F5E10] hover:text-[#F43F5E] transition-all group/logout"
        >
          <LogOut size={18} strokeWidth={1.8} className="group-hover/logout:rotate-12 transition-transform" />
          Logout
        </button>
      </div>
    </aside>
  );
}
