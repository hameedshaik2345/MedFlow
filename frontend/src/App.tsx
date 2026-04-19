import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import DashboardLayout from './layouts/DashboardLayout';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import AppointmentBooking from './pages/AppointmentBooking';
import SymptomAnalyzer from './pages/SymptomAnalyzer';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  ),
});

// Public Routes
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: Login });
const staffLoginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/staff/login', component: StaffLogin });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: Register });
const verifyOtpRoute = createRoute({ 
  getParentRoute: () => rootRoute, 
  path: '/verify-otp', 
  component: VerifyOtp,
  validateSearch: (search: Record<string, unknown>) => ({ email: search.email as string | undefined })
});

// Dashboard Layout Routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'dashboard',
  component: DashboardLayout,
});

const patientDashboardRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/patient-dashboard', component: PatientDashboard });
const patientSymptomsRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/patient/symptoms', component: SymptomAnalyzer });
const appointmentBookingRoute = createRoute({ 
  getParentRoute: () => dashboardRoute, 
  path: '/book-appointment', 
  component: AppointmentBooking,
  validateSearch: (search: Record<string, unknown>) => ({ 
    doctorId: search.doctorId as string | undefined,
    doctorName: search.doctorName as string | undefined 
  })
});
const doctorDashboardRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/doctor-dashboard', component: DoctorDashboard });
const adminDashboardRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/admin/appointments', component: AdminDashboard });
const pharmacistDashboardRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/pharmacist-dashboard', component: PharmacistDashboard });

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  staffLoginRoute,
  registerRoute,
  verifyOtpRoute,
  dashboardRoute.addChildren([
    patientDashboardRoute,
    patientSymptomsRoute,
    appointmentBookingRoute,
    doctorDashboardRoute,
    adminDashboardRoute,
    pharmacistDashboardRoute
  ])
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {showSplash ? (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#E6F4FE] to-[#C9EAFB] transition-opacity duration-500">
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight text-[#0066CC]">MedFlow</h1>
          </div>
        </div>
      ) : (
        <RouterProvider router={router} />
      )}
    </ThemeProvider>
  );
}
