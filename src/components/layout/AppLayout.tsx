import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  Menu,
  Moon,
  PlayCircle,
  Plus,
  Send,
  Settings,
  ShieldAlert,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ToastContainer } from '../common/ToastContainer';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'API Client', path: '/client', icon: Send },
  { label: 'Smart Request Validator', path: '/validator', icon: CheckSquare },
  { label: 'API Error Explainer', path: '/error-explainer', icon: HelpCircle },
  { label: 'API Security Guard', path: '/security-guard', icon: ShieldAlert },
  { label: 'Collections', path: '/collections', icon: FolderKanban },
  { label: 'Collection Runner', path: '/runner', icon: PlayCircle },
  { label: 'Request History', path: '/history', icon: History },
  { label: 'Environment Manager', path: '/environments', icon: Layers },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    settings,
    toggleTheme,
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    resetActiveRequest,
  } = useWorkspace();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentNav = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];

  const handleNewRequest = () => {
    resetActiveRequest();
    navigate('/client');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800/90 dark:bg-[#0F141F] lg:static ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800/90">
          <button
            type="button"
            onClick={() => {
              navigate('/');
              setMobileOpen(false);
            }}
            className="flex items-center gap-2.5 overflow-hidden text-left focus-visible:outline-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Terminal className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
                RelayAPI
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:inline-flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3" aria-label="Primary Sidebar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Theme Action */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800/90">
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100 ${
              collapsed ? 'justify-center px-2' : ''
            }`}
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-indigo-600" />
            )}
            {!collapsed && (
              <span className="whitespace-nowrap">
                {settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm dark:border-slate-800/90 dark:bg-[#0B0F17]/95 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">Workspace</span>
              <span className="hidden text-slate-400 sm:inline">/</span>
              <h1 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Active Environment Switcher */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="global-env-select"
                className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:inline"
              >
                Environment:
              </label>
              <select
                id="global-env-select"
                value={activeEnvironmentId}
                onChange={(e) => setActiveEnvironmentId(e.target.value)}
                className="max-w-[160px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="none">No Environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNewRequest}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Request</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1360px]">{children}</div>
        </main>
      </div>

      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
};
