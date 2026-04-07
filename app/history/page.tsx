"use client";

import { useEffect, useState } from "react";
import Link from "next/link";


interface HistoryItem {
  requestId: string;
  company: {
    name: string;
  };
  roleTitle: string;
  createdAt: string;
  report?: {
    recommendation: string;
  };
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <>
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Your Deep Dive Reports
          </h1>

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">No reports yet.</p>
              <Link
                href="/deep-dive/new"
                className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Create Your First Deep Dive
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <Link
                  key={item.requestId}
                  href={`/deep-dive/${item.requestId}`}
                  className="block p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.company.name}
                      </h3>
                      <p className="text-sm text-gray-600">{item.roleTitle}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {item.report && (
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                            item.report.recommendation === "pursue"
                              ? "bg-green-100 text-green-800"
                              : item.report.recommendation === "avoid"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.report.recommendation.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
