import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  BarChart3,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { startAutoSync, stopAutoSync } from '@/lib/sync'

export default function MainLayout() {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Start background sync when layout mounts
  useEffect(() => {
    // Start auto-sync every 5 minutes
    startAutoSync(5)

    // Cleanup: stop sync when component unmounts
    return () => {
      stopAutoSync()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const closeSidebar = () => setIsSidebarOpen(false)

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarIcon, label: 'Calendario' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/journal', icon: BookOpen, label: 'Diario' },
    { to: '/settings', icon: SettingsIcon, label: 'Impostazioni' },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-card p-2 shadow-lg md:hidden hover:bg-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-2xl font-bold text-primary">TimeFlow</h1>
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="ml-auto rounded-lg p-2 md:hidden hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
