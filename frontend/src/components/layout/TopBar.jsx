import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Search } from 'lucide-react';

export default function TopBar() {
  const { dbUser } = useAuth();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const rawPath = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'dashboard';
  const title = rawPath.charAt(0).toUpperCase() + rawPath.slice(1).replace('-', ' ');

  return (
    <header className="h-[72px] flex items-center justify-between px-8 shrink-0 z-10 w-full relative border-b border-[#ffffff05]">
      <div className="flex items-center gap-8 flex-1">
        <div className="text-body text-[#8A8A94] whitespace-nowrap">
          <Link to="/dashboard" className="hover:text-[#F5F5F7] transition-colors">Overview</Link> 
          <span className="mx-2 text-[#52525B]">/</span> 
          <span className="text-[#F5F5F7] capitalize font-medium">{title}</span>
        </div>

        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" size={16} />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full bg-[#0E0E14] border border-[#ffffff08] rounded-full py-1.5 pl-10 pr-4 text-sm text-[#F5F5F7] focus:outline-none focus:border-[#6366F140] transition-all"
            onChange={(e) => {
              // Basic feedback for "doesn't work"
              console.log('Global search:', e.target.value);
            }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-body-sm text-[#8A8A94] bg-[#0E0E14] border border-[#ffffff10] px-3 py-1.5 rounded-full hidden sm:block">
          {dbUser?.role === 'mentor' ? 'Mentor Mode' : 'Student Mode'}
        </div>
        
        <Link to="/profile" className="flex items-center gap-3 group">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-[#F5F5F7] group-hover:text-[#6366F1] transition-colors">
              {dbUser?.display_name || 'Mentor'}
            </div>
            <div className="text-[10px] text-[#52525B] uppercase tracking-wider leading-tight">View Profile</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-[#6366F1] flex items-center justify-center text-body font-medium text-white shadow-[0_0_0_3px_rgba(99,102,241,0.15)] group-hover:shadow-[0_0_0_4px_rgba(99,102,241,0.25)] transition-all">
            {dbUser?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Link>
      </div>
    </header>
  );
}
