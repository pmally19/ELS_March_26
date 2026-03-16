import { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function PageHeading({ title, description, icon }: PageHeadingProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <div className="bg-primary/10 p-2 rounded-md">
            {icon}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

