
import Link from "next/link";
import { HomepageResumePanel } from "@/components/HomepageResumePanel";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Get Grounded Intelligence
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Before your next interview, understand what's really happening inside
            the company, why the role exists, what the hidden risks are, and how
            to position yourself for success.
          </p>
          <Link
            href="/deep-dive/new"
            className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Generate a Deep Dive
          </Link>
        </div>

        {/* Resume panel — saves to localStorage, used on all deep dives */}
        <div className="mt-10 max-w-2xl mx-auto">
          <HomepageResumePanel />
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-semibold mb-4">What You Get:</h3>
            <ul className="space-y-3 text-gray-600">
              <li>
                <span className="font-medium text-gray-900">Company Snapshot</span>
                <br />
                What's the current strategic focus?
              </li>
              <li>
                <span className="font-medium text-gray-900">Role Mandate</span>
                <br />
                Why does this position exist right now?
              </li>
              <li>
                <span className="font-medium text-gray-900">Risk & Opportunity Flags</span>
                <br />
                What could go wrong? Where's the leverage?
              </li>
              <li>
                <span className="font-medium text-gray-900">Positioning Strategy</span>
                <br />
                How should you frame your fit?
              </li>
              <li>
                <span className="font-medium text-gray-900">Smart Questions</span>
                <br />
                What to ask in the interview
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Decision Support:</h3>
            <ul className="space-y-3 text-gray-600">
              <li>
                <span className="font-medium text-gray-900">Company Momentum</span>
                <br />
                Recent launches and hiring signals
              </li>
              <li>
                <span className="font-medium text-gray-900">Org Clarity</span>
                <br />
                Role clarity and strategic consistency
              </li>
              <li>
                <span className="font-medium text-gray-900">Role Leverage</span>
                <br />
                Scope and impact potential
              </li>
              <li>
                <span className="font-medium text-gray-900">Execution Risk</span>
                <br />
                Restructuring, leadership changes
              </li>
              <li>
                <span className="font-medium text-gray-900">Candidate Fit</span>
                <br />
                Your background alignment
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 bg-gray-50 rounded-lg p-8">
          <h3 className="font-semibold text-gray-900 mb-4">
            💡 Important: This is decision support, not career advice.
          </h3>
          <p className="text-sm text-gray-600">
            The Company Deep-Dive Engine analyzes publicly available information
            and your input using AI to surface signals you should consider. The
            scores and recommendations are based on patterns in public data. Use
            them to inform your thinking, not to replace your judgment. Always
            dig deeper with real conversations.
          </p>
        </div>
      </div>
    </main>
  );
}
