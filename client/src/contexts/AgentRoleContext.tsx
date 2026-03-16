import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AgentRole = 'rookie' | 'coach' | 'player' | 'chief';

interface AgentRoleContextType {
  currentRole: AgentRole;
  setRole: (role: AgentRole) => void;
  roleConfig: {
    name: string;
    description: string;
    permissions: string[];
    color: string;
    bgColor: string;
  };
}

const roleConfigs = {
  rookie: {
    name: 'Rookie Agent',
    description: 'Learning-focused agent with basic permissions',
    permissions: ['view', 'basic-operations'],
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-300'
  },
  coach: {
    name: 'Coach Agent',
    description: 'Training and guidance specialist',
    permissions: ['view', 'train', 'guide', 'moderate-operations'],
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-300'
  },
  player: {
    name: 'Player Agent',
    description: 'Advanced operational agent with full business access',
    permissions: ['view', 'execute', 'business-operations', 'data-management'],
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-300'
  },
  chief: {
    name: 'Chief Agent',
    description: 'Ultimate authority with system-wide oversight',
    permissions: ['view', 'execute', 'approve', 'system-control', 'all-operations'],
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-300'
  }
};

const AgentRoleContext = createContext<AgentRoleContextType | undefined>(undefined);

export function AgentRoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<AgentRole>(() => {
    const stored = localStorage.getItem('agentRole');
    return (stored as AgentRole) || 'chief';
  });

  const setRole = (role: AgentRole) => {
    setCurrentRole(role);
    localStorage.setItem('agentRole', role);
  };

  const roleConfig = roleConfigs[currentRole];

  useEffect(() => {
    // Store the role change in session for backend tracking
    fetch('/api/agent-session/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole })
    }).catch((error) => {
      // Silently handle API errors to prevent app crashes
      console.warn('Failed to update agent role on server:', error);
    });
  }, [currentRole]);

  return (
    <AgentRoleContext.Provider value={{ currentRole, setRole, roleConfig }}>
      {children}
    </AgentRoleContext.Provider>
  );
}

export function useAgentRole() {
  const context = useContext(AgentRoleContext);
  if (!context) {
    throw new Error('useAgentRole must be used within an AgentRoleProvider');
  }
  return context;
}