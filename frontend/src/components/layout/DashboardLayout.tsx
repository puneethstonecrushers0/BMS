import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Receipt,
  Truck,
  Users2,
  ScrollText,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role based navigation items
  const navItems = [];

  if (user?.role === 'ADMIN') {
    navItems.push(
      { name: 'Overview', path: '/overview', icon: LayoutDashboard },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Sales', path: '/sales', icon: Receipt },
      { name: 'Boulders', path: '/boulders', icon: Truck },
      { name: 'Buyers & Vehicles', path: '/references', icon: Building2 },
      { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
      { name: 'User Management', path: '/users', icon: Users2 },
      { name: 'Audit Logs', path: '/audit-logs', icon: ScrollText }
    );
  } else if (user?.role === 'SALES_OPERATOR') {
    navItems.push(
      { name: 'Sales Records', path: '/sales', icon: Receipt },
      { name: 'Buyers & Vehicles', path: '/references', icon: Building2 }
    );
  } else if (user?.role === 'BOULDER_OPERATOR') {
    navItems.push(
      { name: 'Boulder Trips', path: '/boulders', icon: Truck },
      { name: 'Vehicles', path: '/references', icon: Building2 }
    );
  }

  // Get current page name for header
  const currentNav = navItems.find((item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));
  const pageTitle = currentNav?.name || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-[#f9fafb] text-[#111827] font-sans antialiased selection:bg-black selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#e5e7eb] bg-white flex-shrink-0 z-20">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-[#e5e7eb] bg-[#f9fafb] bg-grid-subtle">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider rounded-none shadow-sm">
              BMS
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                Operations
              </div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest font-mono">
                Materials & Boulders
              </div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 text-xs font-medium transition-colors rounded-none border-l-2 ${
                  isActive
                    ? 'bg-[#f3f4f6] text-black border-black font-semibold'
                    : 'text-[#4b5563] border-transparent hover:bg-[#f9fafb] hover:text-black'
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-black' : 'text-[#6b7280]'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer with user badge */}
        <div className="p-3 border-t border-[#e5e7eb] bg-[#f9fafb]">
          <div className="p-2 border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-black truncate max-w-[130px]">
                {user?.name}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#f3f4f6] border border-[#d1d5db] text-black">
                {user?.role}
              </span>
            </div>
            <div className="text-[11px] text-[#6b7280] font-mono truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center justify-center px-3 py-1.5 text-xs font-medium border border-[#d1d5db] bg-white text-[#4b5563] hover:bg-[#f3f4f6] hover:text-black transition-colors rounded-none shadow-subtle"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-none transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-[#e5e7eb]">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#e5e7eb] bg-[#f9fafb]">
              <span className="text-xs font-bold uppercase tracking-wider">BMS Operations</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 border border-[#e5e7eb] text-[#6b7280]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-xs font-medium border-l-2 ${
                      isActive
                        ? 'bg-[#f3f4f6] text-black border-black font-semibold'
                        : 'text-[#4b5563] border-transparent hover:bg-[#f9fafb]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#e5e7eb]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium border border-[#d1d5db] bg-white text-black"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 border border-[#e5e7eb] text-[#4b5563] hover:text-black"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-black uppercase">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-black inline-block" />
              <span className="text-[#6b7280] font-mono text-[11px]">System Online (IST)</span>
            </div>
            <div className="border-l border-[#e5e7eb] pl-4 flex items-center space-x-2">
              <span className="text-xs font-mono font-medium text-black">{user?.name}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono border border-[#e5e7eb] bg-[#f9fafb] text-[#4b5563]">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f9fafb]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
