import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface JsonViewerProps {
  data: unknown;
  rawText?: string;
  indent?: 2 | 4;
  mode?: 'pretty' | 'raw';
  maxHeightClass?: string;
}

function highlightJsonLine(line: string): React.ReactNode {
  const tokenRegex =
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    let cls = 'text-amber-600 dark:text-amber-300';
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        cls = 'text-indigo-700 dark:text-indigo-300 font-medium';
      } else {
        cls = 'text-emerald-700 dark:text-emerald-300';
      }
    } else if (/true|false/.test(token)) {
      cls = 'text-sky-700 dark:text-sky-300';
    } else if (/null/.test(token)) {
      cls = 'text-slate-500 dark:text-slate-400 italic';
    }
    parts.push(
      <span key={idx++} className={cls}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts.length > 0 ? parts : line;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  rawText,
  indent = 2,
  mode = 'pretty',
  maxHeightClass = 'max-h-[420px]',
}) => {
  const [copied, setCopied] = useState(false);

  const formattedString = useMemo(() => {
    if (mode === 'raw') {
      if (rawText !== undefined) return rawText;
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, indent);
      } catch {
        return data;
      }
    }
    if (data === undefined || data === null) {
      return rawText || '';
    }
    try {
      return JSON.stringify(data, null, indent);
    } catch {
      return String(data);
    }
  }, [data, rawText, indent, mode]);

  const lines = useMemo(() => formattedString.split('\n'), [formattedString]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  if (!formattedString.trim()) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        Empty response body.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
        <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
          {lines.length} {lines.length === 1 ? 'line' : 'lines'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className={`overflow-auto p-3 font-mono text-xs leading-relaxed ${maxHeightClass}`}>
        {mode === 'raw' ? (
          <pre className="whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200">
            {formattedString}
          </pre>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-200/40 dark:hover:bg-slate-800/40">
                  <td className="w-10 select-none pr-3 text-right align-top text-slate-400 tabular-nums dark:text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre text-slate-800 dark:text-slate-200">
                    {highlightJsonLine(line)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
