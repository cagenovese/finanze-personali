import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  List,
  Target,
  Users,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/',             label: 'Dashboard',  Icon: LayoutDashboard },
  { path: '/transactions', label: 'Transazioni', Icon: List },
  { path: '/import',       label: 'Import',      Icon: Upload },
  { path: '/budget',       label: 'Budget',      Icon: Target },
  { path: '/splitwise',    label: 'Splitwise',   Icon: Users },
  { path: '/report',       label: 'Report',      Icon: FileText },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside
      className="flex flex-col w-[220px] shrink-0 bg-bg-surface border-r border-bg-elevated"
      style={{ minHeight: '100vh' }}
    >
      {/* Header — traffic lights clearance on macOS */}
      <div className="drag-region h-12 flex items-center px-5 border-b border-bg-elevated">
        <span className="no-drag font-mono text-sm text-accent-base tracking-widest select-none">
          FINANZE
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-left',
                'transition-obsidian no-drag',
                isActive
                  ? 'bg-bg-elevated text-accent-base'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-secondary',
              ].join(' ')}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className="shrink-0"
              />
              <span className="text-sm font-sans">{label}</span>
              {isActive && (
                <span className="ml-auto w-1 h-4 rounded-full bg-accent-base opacity-80" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-bg-elevated">
        <p className="section-label">v0.1.0</p>
      </div>
    </aside>
  )
}
