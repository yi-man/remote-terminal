import { PropsWithChildren } from 'react';

export function PageLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-full bg-gray-900 text-white">
      {children}
    </div>
  );
}
