import { useAuth } from '../../store/auth.context';
import { Bell, LogOut, User, ChevronDown, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { assembliesApi } from '../../api/assemblies.api';
import type { Assembly } from '../../types';

export function Topbar() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeAssembly, setActiveAssembly] = useState<Assembly | null | undefined>(undefined);

  useEffect(() => {
    assembliesApi.getAll()
      .then((res) => {
        const data = res.data;
        const assemblies = Array.isArray(data) ? data : (data as unknown as { assemblies?: Assembly[] }).assemblies ?? [];
        const active = assemblies.find((a) => a.isActive) ?? null;
        setActiveAssembly(active);
      })
      .catch(() => setActiveAssembly(null));
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4 flex-shrink-0 z-10">
      {/* Active Assembly Indicator */}
      <div className="flex items-center gap-3">
        {activeAssembly === undefined ? (
          <div className="skeleton h-5 w-48 rounded" />
        ) : activeAssembly === null ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-700">No Active Assembly</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="text-xs font-medium text-indigo-800 truncate max-w-xs">
              Active: {activeAssembly.assemblyName}
              <span className="ml-1 text-indigo-500">#{activeAssembly.assemblyNumber}</span>
            </span>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notification placeholder */}
        <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <span className="mt-1 badge badge-indigo text-xs">{user?.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
