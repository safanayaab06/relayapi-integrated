import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { KeyValuePair } from '../../types/api';
import { createId } from '../../utils/requestUtils';

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (next: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  allowSecretToggle?: boolean;
  emptyLabel?: string;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  allowSecretToggle = false,
  emptyLabel = 'No items configured.',
}) => {
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const updateRow = (id: string, patch: Partial<KeyValuePair>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeRow = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addRow = () => {
    onChange([
      ...items,
      {
        id: createId('kv'),
        key: '',
        value: '',
        enabled: true,
        isSecret: false,
      },
    ]);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[460px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              <th className="w-10 px-3 py-2 text-center font-medium">Use</th>
              <th className="px-3 py-2 font-medium">{keyPlaceholder}</th>
              <th className="px-3 py-2 font-medium">{valuePlaceholder}</th>
              {allowSecretToggle && <th className="w-20 px-3 py-2 text-center font-medium">Secret</th>}
              <th className="w-12 px-3 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={allowSecretToggle ? 5 : 4}
                  className="px-3 py-5 text-center text-slate-500 dark:text-slate-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const isMasked = Boolean(row.isSecret && !revealedIds[row.id]);
                return (
                  <tr
                    key={row.id}
                    className={`bg-white transition-colors hover:bg-slate-50/80 dark:bg-transparent dark:hover:bg-slate-900/40 ${
                      !row.enabled ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
                        aria-label={`Toggle ${row.key || 'row'}`}
                        className="h-4 w-4 rounded border-slate-300 accent-indigo-600 dark:border-slate-700"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateRow(row.id, { key: e.target.value })}
                        placeholder={keyPlaceholder}
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          type={isMasked ? 'password' : 'text'}
                          value={row.value}
                          onChange={(e) => updateRow(row.id, { value: e.target.value })}
                          placeholder={valuePlaceholder}
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950"
                        />
                        {allowSecretToggle && row.isSecret && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(row.id)}
                            aria-label={isMasked ? 'Reveal value' : 'Hide value'}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            {isMasked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                    {allowSecretToggle && (
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(row.isSecret)}
                          onChange={(e) => updateRow(row.id, { isSecret: e.target.checked })}
                          aria-label="Mark as secret"
                          className="h-4 w-4 rounded border-slate-300 accent-indigo-600 dark:border-slate-700"
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        aria-label="Delete row"
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Row</span>
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
