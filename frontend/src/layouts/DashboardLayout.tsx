import React from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, LayoutDashboard, ClipboardList, Clock, User as UserIcon, FileText, Menu, X, LogOut, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [currentHash, setCurrentHash] = React.useState(window.location.hash);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Define strictly role-based navigation
  let navItems: any[] = [];

  if (user?.role === 'admin') {
    navItems = [
      { name: 'Dashboard', path: '/admin/appointments#dashboard', icon: LayoutDashboard },
      { name: 'Manage Appointments', path: '/admin/appointments#manage', icon: ClipboardList }
    ];
  } else if (user?.role === 'pharmacist') {
    navItems = [
      { name: 'Dashboard', path: '/pharmacist-dashboard', icon: LayoutDashboard },
      { name: 'Generate Bill', path: '/pharmacist-dashboard#generate', icon: FileText }
    ];
  } else if (user?.role === 'doctor') {
    navItems = [
      { name: 'Dashboard', path: '/doctor-dashboard', icon: LayoutDashboard },
      { name: 'My History', path: '/doctor-dashboard#history', icon: Clock }
    ];
  } else {
    // Default: Patient
    navItems = [
      { name: 'Dashboard', path: '/patient-dashboard#dashboard', icon: LayoutDashboard },
      { name: 'Book Visit', path: '/book-appointment', icon: Calendar },
      { name: 'Manage Appointments', path: '/patient-dashboard#manage', icon: ClipboardList },
      { name: 'Medical Reports', path: '/patient-dashboard#history', icon: Clock },
      { name: 'User Profile', path: '/patient-dashboard#profile', icon: UserIcon }
    ];
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const hasHash = item.path.includes('#');
        const [to, hash] = hasHash ? item.path.split('#') : [item.path, ''];
        
        const isActive = hasHash 
          ? (location.pathname === to && currentHash === '#' + hash) || 
            (location.pathname === to && hash === 'dashboard' && !currentHash)
          : (location.pathname === item.path && !currentHash);

        return (
          <a
            key={item.name}
            href={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              isActive 
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0088A8] text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
            {item.name}
          </a>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col shadow-sm">
        <div className="p-8 pb-10 flex items-center gap-3">
          <div className="bg-[#E6F4FE] p-2 rounded-xl">
            <HeartPulse className="h-8 w-8 text-[#0066CC]" strokeWidth={2.5} />
          </div>
          <span className="font-black text-2xl tracking-tighter text-[#1E293B]">MedFlow</span>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <NavLinks />
        </nav>

        <div className="p-6 border-t border-gray-50">
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Signed in as</p>
             <p className="font-bold text-gray-900 truncate">{(user?.name || user?.role || 'User').split(' ')[0]}</p>
          </div>
          <Button 
            onClick={logout} 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold gap-3 h-12"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-6">
         <div className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-[#0066CC]" />
            <span className="font-black text-xl tracking-tighter">MedFlow</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500">
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
           <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-8 pt-24 animate-in slide-in-from-right duration-300">
              <nav className="space-y-4">
                 <NavLinks />
                 <hr className="my-6 border-gray-100" />
                 <Button onClick={logout} variant="outline" className="w-full h-12 font-bold text-red-500 border-red-100">Sign Out</Button>
              </nav>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden lg:pl-0 pt-16 lg:pt-0">
        <header className="hidden lg:flex h-20 items-center justify-end px-12 bg-white/50 backdrop-blur-md border-b border-gray-50 shrink-0">
           <div className="flex items-center gap-4">
              <div className="text-right">
                 <p className="text-sm font-black text-gray-900 capitalize">{user?.role}</p>
                 <p className="text-xs font-bold text-[#0066CC]">{user?.address?.split(',')[0] || 'Main Branch'}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
                {user?.role?.[0]?.toUpperCase() || 'U'}
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
