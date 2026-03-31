import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Company Deep-Dive Engine
        </Link>
        <nav className="flex gap-6">
          <Link href="/deep-dive/new" className="text-gray-600 hover:text-gray-900">
            New Analysis
          </Link>
          <Link href="/history" className="text-gray-600 hover:text-gray-900">
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}
