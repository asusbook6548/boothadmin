import { useAuth } from '../../store/auth.context';
import { useAssembly } from '../../store/assembly.context';
import { LogOut, User, HouseIcon, ChevronDown, AlertTriangle, Building2, MapPin, Menu } from 'lucide-react';
import { useState } from 'react';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { assembly: activeAssembly, openModal } = useAssembly();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4 flex-shrink-0 z-10">
      {/* Assembly Details in Header */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {activeAssembly === undefined ? (
          <div className="skeleton h-8 w-36 sm:w-72 rounded-xl" />
        ) : activeAssembly === null ? (
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer group text-left"
            title="Click to configure assembly constituency"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
            <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">No Assembly Configured</span>
            <span className="text-[11px] font-medium text-amber-600 underline group-hover:text-amber-900 hidden sm:inline">(Configure Now)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            {/* Assembly Number */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <HouseIcon className="w-3.5 h-3.5 text-indigo-600 hidden sm:block flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">Assembly No :</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                #{activeAssembly.number ?? activeAssembly.assemblyNumber}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block flex-shrink-0" />

            {/* Assembly Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 hidden sm:block flex-shrink-0" />
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400 hidden md:inline">
                  Assembly Name :
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
                  {activeAssembly.name ?? activeAssembly.assemblyName}
                </span>
              </div>
            </div>

            {/* District */}
            {activeAssembly.district && (
              <>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 hidden sm:block flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-400 hidden md:inline">
                      Assembly District :
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">                      {activeAssembly.district}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
      

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
