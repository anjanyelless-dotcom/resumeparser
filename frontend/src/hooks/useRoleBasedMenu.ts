import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { sidebarMenuConfig, type UserRole } from '../config/sidebarMenuConfig';

export const useRoleBasedMenu = () => {
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole;

  
  return useMemo(() => {
    return sidebarMenuConfig
      .filter(item => !item.roles || item.roles.includes(userRole))
      .map(item => ({
        ...item,
        children: item.children?.filter(child => 
          !child.roles || child.roles.includes(userRole)
        ),
      }))
      .filter(item => !item.children || item.children.length > 0);
  }, [userRole]);
};
