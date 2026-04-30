import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';

export default function Login() {
  const [roleMode, setRoleMode] = useState('mentor');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let loginEmail = identifier;
    if (roleMode === 'student') {
      loginEmail = `${identifier.trim().toLowerCase()}@forge.local`;
    }

    const { data, error: signInError } = await signIn(loginEmail, password);

    if (signInError) {
      setError('Invalid credentials or account not found');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex bg-[#07070B] min-h-screen items-center justify-center relative overflow-hidden font-body text-[#F5F5F7]">
      <div className="absolute inset-0 bg-[var(--glow-cosmic)] top-[-30vh] opacity-30 w-full object-cover"></div>
      
      <div className="card w-full max-w-[440px] z-10 px-12 py-12 flex flex-col relative text-center border border-[#ffffff10]">
        <div className="mb-8">
            <h2 className="text-display-sm text-[#F5F5F7] tracking-tight">ForgeTrack</h2>
        </div>
        
        <div className="flex w-full items-center bg-[#0E0E14] border rounded-md border-[#ffffff10] p-1 mb-6">
          <button 
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${roleMode === 'mentor' ? 'bg-[#16161F] text-[#F5F5F7]' : 'text-[#8A8A94]'}`}
            onClick={() => { setRoleMode('mentor'); setIdentifier(''); setError(''); }}
          >
            Mentor 
          </button>
          <button 
            type="button"
            className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-colors ${roleMode === 'student' ? 'bg-[#16161F] text-[#F5F5F7]' : 'text-[#8A8A94]'}`}
            onClick={() => { setRoleMode('student'); setIdentifier(''); setError(''); }}
          >
            Student
          </button>
        </div>

        <form className="flex flex-col text-left gap-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-label text-[#8A8A94] mb-2">{roleMode === 'mentor' ? 'EMAIL' : 'USN'}</label>
            <input 
              type={roleMode === 'mentor' ? 'email' : 'text'}
              className="input w-full"
              placeholder={roleMode === 'mentor' ? 'mentor@theboringpeople.in' : '4SH24CS...'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block text-label text-[#8A8A94] mb-2">PASSWORD</label>
            <input 
              type="password"
              className="input w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-[#F43F5E] text-caption text-center pt-2">{error}</div>}

          <button type="submit" className="btn-primary mt-2 flex justify-center py-3" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
