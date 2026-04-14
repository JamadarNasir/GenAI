export default function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-600">
        AI Test Automation Agent — Dashboard
      </h2>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-xs text-gray-400">Backend: localhost:4000</span>
        <span className="inline-flex h-2 w-2 rounded-full bg-green-400" title="Server Online" />
      </div>
    </header>
  );
}
