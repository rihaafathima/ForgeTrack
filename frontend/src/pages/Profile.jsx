import { useAuth } from '../components/auth/AuthProvider';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function Profile() {
  const { dbUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header>
        <h1 className="text-display-sm text-primary mb-2 font-display">Account Settings</h1>
        <p className="text-secondary">Manage your profile and account preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card p-8 flex flex-col items-center text-center gap-4 h-fit">
          <div className="h-24 w-24 rounded-full bg-[#6366F1] flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] border-4 border-[#ffffff10]">
            {dbUser?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">{dbUser?.display_name}</h2>
            <p className="text-sm text-secondary capitalize">{dbUser?.role}</p>
          </div>
          <button className="btn-secondary w-full py-2 text-sm mt-2">Change Avatar</button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="card p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-bold tracking-widest">
                  <User size={12} /> Full Name
                </div>
                <div className="text-primary font-medium">{dbUser?.display_name}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-bold tracking-widest">
                  <Mail size={12} /> Email Address
                </div>
                <div className="text-primary font-medium">{dbUser?.email}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-bold tracking-widest">
                  <Shield size={12} /> Role
                </div>
                <div className="text-primary font-medium capitalize">{dbUser?.role}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-micro text-tertiary uppercase font-bold tracking-widest">
                  <Calendar size={12} /> Joined On
                </div>
                <div className="text-primary font-medium">
                  {dbUser?.created_at ? new Date(dbUser.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[#ffffff05] flex gap-4">
              <button className="btn-primary px-8">Edit Profile</button>
              <button className="btn-secondary px-8">Change Password</button>
            </div>
          </div>

          <div className="card p-8 border-danger-border/20 bg-danger-bg/5">
            <h3 className="text-lg font-bold text-[#F43F5E] mb-2 text-primary">Danger Zone</h3>
            <p className="text-sm text-secondary mb-6">Once you delete your account, there is no going back. Please be certain.</p>
            <button className="text-[#F43F5E] bg-[#F43F5E10] border border-[#F43F5E20] px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#F43F5E20] transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
