import { usePermissionStore } from '../store/usePermissionStore';

/**
 * Hook to check if the current user has a specific permission.
 * Usage: const canCreateUser = useHasPermission('users_menu', 'create');
 */
export function useHasPermission(module: string, action: string = 'view') {
  const hasPermission = usePermissionStore(state => state.hasPermission);
  return hasPermission(module, action);
}
