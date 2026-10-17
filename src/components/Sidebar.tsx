import React from 'react';
import {
  LayoutDashboard,
  Database,
  CheckCheck,
  Tag,
  ClipboardList,
  FileBarChart2,
  Settings,
  Building2,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'datasets'
  | 'run_checks'
  | 'annotation_review'
  | 'review_centre'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingReviewsCount: number;
  totalIssuesCount: number;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewsCount,
  totalIssuesCount,
  datasetCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'datasets' as NavTab,
      label: 'Datasets',
      icon: Database,
      badge: datasetCount > 0 ? datasetCount : null,
    },
    {
      id: 'run_checks' as NavTab,
      label: 'Run Checks',
      icon: CheckCheck,
      badge: totalIssuesCount > 0 ? `${totalIssuesCount}` : null,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'annotation_review' as NavTab,
      label: 'Annotation Review',
      icon: Tag,
      badge: null,
    },
    {
      id: 'review_centre' as NavTab,
      label: 'Review Centre',
      icon: ClipboardList,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Exports',
      icon: FileBarChart2,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 h-full border-r border-slate-800">
      {/* Navigation Links */}
      <div className="py-6 px-3">
        <div className="px-3 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Platform Modules
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Enterprise Organization Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Vattara Solutions</p>
            <p className="text-[11px] text-slate-400 truncate">Enterprise Tenant</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
