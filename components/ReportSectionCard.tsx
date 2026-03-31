"use client";

interface ReportSectionCardProps {
  title: string;
  content: string;
  citations?: Array<{
    source_id: string;
    url?: string;
    title: string;
  }>;
}

export function ReportSectionCard({
  title,
  content,
  citations,
}: ReportSectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <div className="prose prose-sm max-w-none mb-4">
        {content.split("\n").map((line, i) => (
          <p key={i} className="text-gray-700 leading-relaxed">
            {line}
          </p>
        ))}
      </div>

      {citations && citations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">Sources:</div>
          <div className="space-y-1">
            {citations.map((citation, i) => (
              <div key={i} className="text-sm">
                {citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {citation.title}
                  </a>
                ) : (
                  <span className="text-gray-600">{citation.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
