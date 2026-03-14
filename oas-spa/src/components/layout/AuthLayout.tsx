import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lien-50 dark:bg-lien-900 transition-theme duration-theme px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  );
}
