import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  Network, 
  Search, 
  ShieldCheck, 
  Bell, 
  Settings, 
  ShieldAlert,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useListNotifications } from '@workspace/api-client-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  const { data: notifications } = useListNotifications({
    query: { enabled: !!user, queryKey: ['/api/notifications'] }
  });
  
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Knowledge Graph', path: '/knowledge-graph', icon: Network },
    { name: 'Root Cause Analysis', path: '/rca', icon: Search },
    { name: 'Compliance', path: '/compliance', icon: ShieldCheck },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldAlert });
  }

  // Close sidebar on route change on mobile
  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold font-sans tracking-tight text-white hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            ForgeMind
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 flex-none flex items-center justify-between px-4 lg:px-8 border-b border-border bg-background/95 backdrop-blur-sm z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-foreground/70 hover:text-foreground"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold capitalize font-sans tracking-tight hidden sm:block">
              {location.split('/')[1] || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/notifications" className="relative p-2 text-foreground/70 hover:text-primary transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#070b14]">
          {children}
        </div>
      </main>
    </div>
  );
}