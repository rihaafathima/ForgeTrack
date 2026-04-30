import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#0B0B11] overflow-hidden text-[#F5F5F7] font-body relative">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden z-0">
        <div className="absolute inset-0 top-0 left-0 w-full h-[600px] pointer-events-none z-[-1]" style={{ backgroundImage: 'var(--glow-cosmic)' }}></div>
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 pb-12 pt-4 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
