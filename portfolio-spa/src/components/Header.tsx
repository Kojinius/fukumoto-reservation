import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/utils/cn';

const navLinks = [
  { to: '/', label: 'Portfolio' },
  { to: '/resume', label: '履歴書' },
  { to: '/cv', label: '職務経歴書' },
] as const;

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-canvas/80 dark:bg-brown-950/80 border-b border-brown-200/60 dark:border-brown-800/60 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-brown-600 dark:text-brown-300">
          kojinius.jp
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'text-[11px] font-medium rounded-full px-3 py-1 transition-colors',
                  pathname === link.to
                    ? 'bg-brown-100 dark:bg-brown-900 text-brown-500 dark:text-brown-400 border border-brown-200/50 dark:border-brown-800/50'
                    : 'text-brown-400 dark:text-brown-500 hover:text-brown-600 dark:hover:text-brown-300',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
