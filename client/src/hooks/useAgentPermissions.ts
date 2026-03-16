import { useAgentRole } from '@/contexts/AgentRoleContext';

/**
 * Hook for agent-based permission checking across the application
 */
export function useAgentPermissions() {
  const { currentRole } = useAgentRole();

  // Permission levels by agent role
  const permissions = {
    rookie: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
      canExport: true,
      canApprove: false,
      label: 'View Only'
    },
    player: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
      canExport: true,
      canApprove: false,
      label: 'Restricted Access'
    },
    coach: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canImport: true,
      canExport: true,
      canApprove: true,
      label: 'Full Access'
    },
    chief: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canImport: true,
      canExport: true,
      canApprove: true,
      label: 'Administrative Access'
    }
  };

  const currentPermissions = permissions[currentRole] || permissions.rookie;

  return {
    ...currentPermissions,
    currentRole,
    hasDataModificationRights: currentRole === 'coach' || currentRole === 'chief',
    hasFullAccess: currentRole === 'coach' || currentRole === 'chief',
    getRestrictedMessage: () => {
      switch (currentRole) {
        case 'rookie':
          return 'Learning mode - view-only access';
        case 'player':
          return 'Player agents require approval for data changes';
        default:
          return 'Access restricted';
      }
    }
  };
}