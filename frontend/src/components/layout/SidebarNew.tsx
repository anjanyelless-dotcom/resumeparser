import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useRoleBasedMenu } from '../../hooks/useRoleBasedMenu';

import type { MenuItem } from '../../config/sidebarMenuConfig';
import { Badge } from '../ui/Badge';

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function SidebarNew({ open = true, onClose }: SidebarProps) {
  const { expandedItems, toggleItem } = useSidebarState();
  const menuItems = useRoleBasedMenu();
  const location = useLocation();

  // Auto-expand the parent menu when a child is active
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          child.path === location.pathname
        );
        if (hasActiveChild && !expandedItems.includes(item.id)) {
          toggleItem(item.id);
        }
      }
    });
  }, [location.pathname, menuItems, expandedItems, toggleItem]);

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggleItem(item.id)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200 ${
              isExpanded
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            style={{ paddingLeft: `${12 + level * 12}px` }}
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon className="h-4.5 w-4.5" />}
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {isExpanded && item.children && (
            <div className="space-y-1 mt-1">
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.path || '#'}
        onClick={() => onClose?.()}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
            isActive
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`
        }
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        <span className="text-sm font-medium">{item.label}</span>
        {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-all duration-200 ease-in-out lg:relative lg:z-0 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full w-64 px-4 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-sm shadow-purple-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              ATS Analyzer
            </p>
            <p className="text-xs text-gray-500">AI-Powered Recruitment</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 text-sm font-medium overflow-y-auto">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Demo Mode Badge */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-blue-700">Demo Mode</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
