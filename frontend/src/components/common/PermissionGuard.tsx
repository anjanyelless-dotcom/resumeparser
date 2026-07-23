import React from 'react';
import { usePermissionStore } from '../../store/usePermissionStore';

interface PermissionGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'hide' | 'disable' | 'readonly';
}

export default function PermissionGuard({
  module,
  action = 'view',
  children,
  fallback = null,
  mode = 'hide'
}: PermissionGuardProps) {
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const isAllowed = hasPermission(module, action);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (mode === 'hide') {
    return <>{fallback}</>;
  }

  if (mode === 'disable') {
    // We clone the child element and add the disabled prop and visual styles
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        disabled: true,
        className: `${(children.props as any).className || ''} opacity-50 cursor-not-allowed`,
        onClick: undefined,
        title: "You do not have permission to perform this action"
      } as any);
    }
  }

  if (mode === 'readonly') {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        readOnly: true,
        className: `${(children.props as any).className || ''} bg-gray-50`,
        title: "You do not have edit permissions"
      } as any);
    }
  }

  return <>{fallback}</>;
}
