import { Link, useLocation } from 'react-router-dom'
import {
  Home, Newspaper, CheckSquare, Activity, BarChart, Settings as SettingsIcon
} from 'lucide-react'

interface NavigationItem {
  name: string;
  path: string;
  icon: typeof Home;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'News Feed', path: '/news', icon: Newspaper },
  { name: 'Approval Queue', path: '/approval', icon: CheckSquare },
  { name: 'Agent Monitoring', path: '/agents', icon: Activity },
  { name: 'Metrics', path: '/metrics', icon: BarChart },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
]

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">
                JioNews Sentinel
              </h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                AUTONOMOUS
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                AI-Powered Newsroom
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <nav className="px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
