import { usePermissionStore } from "../store/usePermissionStore";

/**
 * Hook to check if the current user has a specific permission
 * @param module - The module name (e.g., "candidates", "upload", "settings")
 * @param action - The action name (e.g., "view", "create", "edit", "delete")
 * @returns boolean - Whether the user has the permission
 */
export const usePermission = (module: string, action: string): boolean => {
  return usePermissionStore(state => state.hasPermission(module, action));
};

/**
 * Hook to get all user permissions
 * @returns UserPermission[] - Array of user's permissions
 */
export const useUserPermissions = () => {
  return usePermissionStore(state => state.userPermissions);
};

/**
 * Hook to get permission loading state
 * @returns boolean - Whether permissions are being loaded
 */
export const usePermissionLoading = () => {
  return usePermissionStore(state => state.isLoading);
};