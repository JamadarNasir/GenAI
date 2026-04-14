import { NavLink } from 'react-router-dom';

const links = [
  { to: '/upload', label: '📤 Upload CSV', icon: '1' },
  { to: '/bdd', label: '📝 BDD Preview', icon: '2' },
  { to: '/code', label: '💻 Code Viewer', icon: '3' },
  { to: '/execution', label: '▶️ Execution', icon: '4' },
  { to: '/reports', label: '📊 Reports', icon: '5' },
];

export default function Sidebar() {
  return (
    <aside className="w-48 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-2.5 py-2.5 border-b border-gray-700">
        <h1 className="text-sm font-bold text-primary-light">🤖 AI Test Agent</h1>
        <p className="text-[10px] text-gray-400 mt-0.5">Playwright + Cucumber + AI</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-[10px] bg-gray-700 rounded-full w-4 h-4 flex items-center justify-center">
              {link.icon}
            </span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-2 border-t border-gray-700 text-[10px] text-gray-500">
        v1.0.0 — Phase-by-Phase
      </div>
    </aside>
  );
}
