import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Zap, 
  Settings, 
  CloudSun, 
  Users, 
  BarChart3, 
  Bell, 
  Moon, 
  Sun,
  LogOut,
  Leaf
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/household-setup', label: 'Household Setup', icon: Settings },
    { path: '/devices', label: 'Devices', icon: Zap },
    { path: '/forecasting', label: 'Forecasting', icon: CloudSun },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    return path !== '/' && location.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Leaf className="text-sidebar-primary-foreground text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">GreenGrid</h1>
              <p className="text-sm text-muted-foreground">AI Energy Management</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a 
                    className={`nav-item flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      isActive(item.path) 
                        ? 'active bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-sidebar-accent">
            <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
              <span className="text-sm text-sidebar-primary-foreground font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Energy Dashboard</h2>
            <p className="text-muted-foreground">
              <span data-testid="text-current-date">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>{' '}
              • <span className="text-primary font-medium">Mumbai, India</span>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Weather Widget */}
            <div className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-lg">
              <Sun className="text-accent w-4 h-4" />
              <span className="text-sm font-medium" data-testid="text-temperature">28°C</span>
              <span className="text-xs text-muted-foreground" data-testid="text-weather-condition">Sunny</span>
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full pulse-green"></span>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
