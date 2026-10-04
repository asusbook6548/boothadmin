import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Landmark, Tags,
  UserCheck, BarChart3, FileText, Upload, Shield, Settings,
  ClipboardList, ChevronLeft, ChevronRight, Vote, LogOut,
} from 'lucide-react';
import { useAuth } from '../../store/auth.context';

const isSystemUser = (u?: { name?: string; email?: string } | null): boolean =>
  Boolean(u?.name?.toLowerCase().includes('system') || u?.email?.toLowerCase() === 'admin@boothcommand.com');

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  children?: { to: string; label: string }[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/booths', label: 'Booths', icon: <Landmark className="w-5 h-5" /> },
  { to: '/voters', label: 'Voters', icon: <Vote className="w-5 h-5" /> },
  { to: '/classification', label: 'Classification', icon: <Tags className="w-5 h-5" /> },
  { to: '/volunteers', label: 'Volunteers', icon: <UserCheck className="w-5 h-5" /> },
  {
    to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />,
    children: [
      { to: '/analytics', label: 'Overview' },
      { to: '/analytics/booths/strong', label: 'Strong Booths' },
      { to: '/analytics/booths/weak', label: 'Weak Booths' },
      { to: '/analytics/booths/opportunity', label: 'Opportunity' },
      { to: '/analytics/booths/confidence', label: 'High Confidence' },
    ],
  },
  {
    to: '/reports', label: 'Reports', icon: <FileText className="w-5 h-5" />,
    children: [
      { to: '/reports', label: 'Summary' },
      { to: '/reports/voters', label: 'Voters' },
      { to: '/reports/booths', label: 'Booths' },
      { to: '/reports/volunteers', label: 'Volunteers' },
      { to: '/reports/classification', label: 'Classification' },
    ],
  },
  { to: '/import', label: 'Import Voters', icon: <Upload className="w-5 h-5" /> },
  { to: '/users', label: 'Users', icon: <Shield className="w-5 h-5" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  { to: '/audit-logs', label: 'Audit Logs', icon: <ClipboardList className="w-5 h-5" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.to ||
    (item.children?.some(c => location.pathname === c.to));
  const isParentActive = item.children?.some(c => location.pathname.startsWith(c.to));

  if (item.children) {
    return (
      <div>
        <NavLink
          to={item.to}
          className={clsx(
            'sidebar-link',
            (isActive || isParentActive) ? 'sidebar-link-active' : 'sidebar-link-inactive'
          )}
          title={collapsed ? item.label : undefined}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
        {!collapsed && (isActive || isParentActive) && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end
                className={({ isActive }) => clsx(
                  'block px-2 py-1.5 text-xs rounded-md transition-colors',
                  isActive ? 'text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) => clsx(
        'sidebar-link',
        isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const isSys = isSystemUser(user);

  const visibleNavItems = navItems.filter((item) => {
    if (item.to === '/users') {
      return isSys;
    }
    return true;
  });

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-4 border-b border-slate-800',
        collapsed && 'justify-center'
      )}>
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Vote className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white">Booth Command</div>
            <div className="text-xs text-slate-400">v3.1.1</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleNavItems.map((item) => (
          <SidebarItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-slate-800 p-2 space-y-1">
        <button
          onClick={logout}
          className={clsx(
            'w-full flex items-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors',
            collapsed ? 'justify-center' : 'gap-3 px-3'
          )}
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
