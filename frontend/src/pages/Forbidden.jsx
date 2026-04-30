import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';

export default function Forbidden() {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  
  const returnUrl = dbUser?.role === 'mentor' ? '/dashboard' : '/me/attendance';

  return (
    <div className="flex bg-[#07070B] min-h-screen items-center justify-center text-center px-4 relative overflow-hidden font-body text-[#F5F5F7]">
      <div className="absolute inset-0 bg-[var(--glow-cosmic)] top-[-10vh] opacity-20 w-full object-cover"></div>
      
      <div className="card w-full max-w-[480px] z-10 px-8 py-12 flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-[#16161F] flex items-center justify-center text-[#F43F5E] mb-6 shadow-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-h2 font-display mb-2">Access Denied</h2>
        <p className="text-body text-[#8A8A94] mb-8">
          You don't have permission to view this page. If you believe this is an error, please contact a mentor.
        </p>
        <button onClick={() => navigate(returnUrl)} className="btn-primary w-full">
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
