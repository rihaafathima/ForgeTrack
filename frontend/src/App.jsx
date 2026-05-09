import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { RoleGuard, PublicGuard } from './components/auth/RoleGuard';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';
import Forbidden from './pages/Forbidden';

// Mentor Pages
import Dashboard from './pages/mentor/Dashboard';
import MarkAttendance from './pages/mentor/MarkAttendance';
import StudentHistory from './pages/mentor/StudentHistory';
import Materials from './pages/mentor/Materials';
import UploadCSV from './pages/mentor/UploadCSV';
import ErrorBoundary from './components/common/ErrorBoundary';

// Student Pages
import MyAttendance from './pages/student/MyAttendance';
import Upcoming from './pages/student/Upcoming';
import StudyMaterials from './pages/student/StudyMaterials';

function RootRedirect() {
  const { dbUser } = useAuth();
  if (dbUser?.role === 'mentor') return <Navigate to="/dashboard" replace />;
  if (dbUser?.role === 'student') return <Navigate to="/me/attendance" replace />;
  return <Navigate to="/login" replace />;
}

import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicGuard />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route path="/403" element={<Forbidden />} />

          {/* Root Redirect */}
          <Route path="/" element={<RoleGuard><RootRedirect /></RoleGuard>} />

          {/* Protected Common Routes */}
          <Route element={<RoleGuard><AppLayout /></RoleGuard>}>
             <Route path="profile" element={<Profile />} />
          </Route>

          {/* Protected Mentor Routes */}
          <Route element={<RoleGuard allowedRoles={['mentor']}><AppLayout /></RoleGuard>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="attendance" element={<MarkAttendance />} />
            <Route path="history" element={<StudentHistory />} />
            <Route path="materials" element={<Materials />} />
            <Route path="upload" element={<ErrorBoundary><UploadCSV /></ErrorBoundary>} />
          </Route>

          {/* Protected Student Routes */}
          <Route element={<RoleGuard allowedRoles={['student']}><AppLayout /></RoleGuard>}>
            <Route path="me/attendance" element={<MyAttendance />} />
            <Route path="me/upcoming" element={<Upcoming />} />
            <Route path="me/materials" element={<StudyMaterials />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
