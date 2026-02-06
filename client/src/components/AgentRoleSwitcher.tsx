import { useState } from 'react';
import { useAgentRole, type AgentRole } from '@/contexts/AgentRoleContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bot, ChevronDown, UserCheck, Users, Crown, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const roleIcons = {
  rookie: GraduationCap,
  coach: UserCheck,
  player: Users,
  chief: Crown
};

const roleColors = {
  rookie: 'bg-blue-600 hover:bg-blue-700',
  coach: 'bg-green-600 hover:bg-green-700',
  player: 'bg-purple-600 hover:bg-purple-700',
  chief: 'bg-red-600 hover:bg-red-700'
};

const roleBadgeColors = {
  rookie: 'bg-blue-100 text-blue-900',
  coach: 'bg-green-100 text-green-900',
  player: 'bg-purple-100 text-purple-900',
  chief: 'bg-red-100 text-red-900'
};

export default function AgentRoleSwitcher() {
  const { currentRole, setRole, roleConfig } = useAgentRole();
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);

  const handleRoleChange = async (newRole: AgentRole) => {
    if (newRole === currentRole) return;
    
    setIsChanging(true);
    
    try {
      setRole(newRole);
      
      toast({
        title: "Agent Role Changed",
        description: `Successfully switched to ${roleConfig.name}`,
      });
      
      // Small delay to show the change
      setTimeout(() => setIsChanging(false), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change agent role",
        variant: "destructive",
      });
      setIsChanging(false);
    }
  };

  const CurrentIcon = roleIcons[currentRole];

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${roleBadgeColors[currentRole]} text-xs font-medium`}>
        Current Role
      </Badge>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={`${roleColors[currentRole]} text-white border-0 shadow-sm ${isChanging ? 'opacity-75' : ''}`}
            disabled={isChanging}
          >
            <CurrentIcon className="h-4 w-4 mr-2" />
            {roleConfig.name}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Switch Agent Role
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {(Object.keys(roleIcons) as AgentRole[]).map((role) => {
            const Icon = roleIcons[role];
            const config = {
              rookie: { name: 'Rookie Agent', desc: 'Basic learning mode' },
              coach: { name: 'Coach Agent', desc: 'Training specialist' },
              player: { name: 'Player Agent', desc: 'Advanced operations' },
              chief: { name: 'Chief Agent', desc: 'Ultimate authority' }
            }[role];
            
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`cursor-pointer ${role === currentRole ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{config.name}</span>
                      <span className="text-xs text-muted-foreground">{config.desc}</span>
                    </div>
                  </div>
                  {role === currentRole && (
                    <Badge className={roleBadgeColors[role]}>
                      Active
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
          
          <DropdownMenuSeparator />
          <div className="p-2 text-xs text-muted-foreground">
            Current: {roleConfig.description}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}