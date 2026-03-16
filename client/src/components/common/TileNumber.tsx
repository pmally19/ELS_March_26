import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TileNumberProps {
  tileNumber: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function TileNumber({ 
  tileNumber, 
  className, 
  variant = "outline", 
  size = "sm" 
}: TileNumberProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 h-5",
    md: "text-sm px-2 py-1 h-6",
    lg: "text-base px-2.5 py-1.5 h-7"
  };

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-mono font-medium tracking-tight",
        sizeClasses[size],
        className
      )}
    >
      {tileNumber}
    </Badge>
  );
}

interface TileHeaderProps {
  tileNumber: string;
  tileName: string;
  description?: string;
  children?: React.ReactNode;
}

export function TileHeader({ tileNumber, tileName, description, children }: TileHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <TileNumber tileNumber={tileNumber} size="md" />
          <h1 className="text-2xl font-bold tracking-tight">{tileName}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface TileCardProps {
  tileNumber: string;
  tileName: string;
  description?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function TileCard({ 
  tileNumber, 
  tileName, 
  description, 
  icon, 
  isActive = true,
  onClick,
  className,
  children
}: TileCardProps) {
  return (
    <div
      className={cn(
        "relative border rounded-lg p-4 transition-all duration-200",
        isActive 
          ? "bg-card hover:bg-accent/50 border-border hover:border-primary/30" 
          : "bg-muted/30 border-muted text-muted-foreground",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2">
        <TileNumber tileNumber={tileNumber} size="sm" />
      </div>
      
      <div className="pr-16 space-y-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-sm">{tileName}</h3>
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        
        {children}
      </div>
    </div>
  );
}

export default TileNumber;