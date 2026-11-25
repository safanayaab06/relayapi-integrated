import React, { useEffect, useMemo, useState } from 'react';
import { Check, Layers, Plus, Save, Trash2, X } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { KeyValueEditor } from '../components/common/KeyValueEditor';
import { useWorkspace } from '../context/WorkspaceContext';
import { Environment, KeyValuePair } from '../types/api';
import { createId, interpolateVariables } from '../utils/requestUtils';

export const EnvironmentsPage: React.FC = () => {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    saveEnvironment,
    deleteEnvironment,
    requestConfirm,
    notify,
  } = useWorkspace();

  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments.find((e) => e.id === activeEnvironmentId)?.id || environments[0]?.id || ''
  );

  const selectedEnv = useMemo(
    () => environments.find((e) => e.id === selectedEnvId) || null,
    [environments, selectedEnvId]
  );

  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftVars, setDraftVars] = useState<KeyValuePair[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState('{{baseUrl}}/users/{{userId}}');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvDesc, setNewEnvDesc] = useState('');

  useEffect(() => {
    if (selectedEnv) {
      setDraftName(selectedEnv.name);
      setDraftDesc(selectedEnv.description || '');
      setDraftVars(
        selectedEnv.variables.map((v) => ({
          id: v.id,
          key: v.key,
          value: v.value,
          enabled: v.enabled,
          isSecret: v.isSecret,
        }))
      );
    }
  }, [selectedEnv]);

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnv || !draftName.trim()) {
      notify({ type: 'error', title: 'Environment Name Required' });
      return;
    }

    const updated: Environment = {
      ...selectedEnv,
      name: draftName.trim(),
      description: draftDesc.trim(),
      variables: draftVars
        .filter((v) => v.key.trim() !== '' || v.value.trim() !== '')
        .map((v) => ({
          id: v.id,
          key: v.key.trim(),
          value: v.value,
          enabled: v.enabled,
          isSecret: v.isSecret,
        })),
      updatedAt: new Date().toISOString(),
    };
    saveEnvironment(updated);
    notify({ type: 'success', title: 'Environment Saved', message: `"${updated.name}" updated.` });
  };

  const handleCreateEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) {
      notify({ type: 'error', title: 'Environment Name Required' });
      return;
    }
    const created: Environment = {
      id: createId('env'),
      name: newEnvName.trim(),
      description: newEnvDesc.trim(),
      variables: [
        { id: createId('ev'), key: 'baseUrl', value: 'https://api.example.com', enabled: true },
      ],
      updatedAt: new Date().toISOString(),
    };
    saveEnvironment(created);
    setSelectedEnvId(created.id);
    setCreateOpen(false);
    setNewEnvName('');
    setNewEnvDesc('');
    notify({ type: 'success', title: 'Environment Created', message: `"${created.name}" added.` });
  };

  const liveResolvedPreview = useMemo(() => {
    const simulatedEnv: Environment | null = selectedEnv
      ? {
          ...selectedEnv,
          variables: draftVars.map((v) => ({
            id: v.id,
            key: v.key,
            value: v.value,
            enabled: v.enabled,
            isSecret: v.isSecret,
          })),
        }
      : null;
    return interpolateVariables(previewTemplate, simulatedEnv);
  }, [previewTemplate, draftVars, selectedEnv]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Environment Manager
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Configure Local, Staging, and custom environments. Use <code className="font-mono">{'{{variable}}'}</code> placeholders in API URLs, headers, and payloads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Environment</span>
        </button>
      </section>

      {environments.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No environments configured"
          description="Create an environment such as Local or Staging to manage base URLs and API tokens."
          actionLabel="Create Environment"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Environments Sidebar */}
          <aside className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
            <p className="px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Environments ({environments.length})
            </p>
            <div className="space-y-1.5">
              {environments.map((env) => {
                const isSelected = env.id === selectedEnvId;
                const isActive = env.id === activeEnvironmentId;
                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{env.name}</p>
                      <p className="font-mono text-[11px] opacity-75 tabular-nums">
                        {env.variables.length} vars{isActive ? ' · Active' : ''}
                      </p>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Environment Editor */}
          {selectedEnv && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {selectedEnv.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedEnv.id === activeEnvironmentId
                      ? 'Currently active across API Client and Collection Runner'
                      : 'Inactive environment'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedEnv.id !== activeEnvironmentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEnvironmentId(selectedEnv.id);
                        notify({
                          type: 'success',
                          title: 'Active Environment Switched',
                          message: `Now using "${selectedEnv.name}".`,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Set as Active</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm(
                        {
                          title: 'Delete Environment',
                          message: `Delete environment "${selectedEnv.name}" and all its variables?`,
                          confirmLabel: 'Delete Environment',
                        },
                        () => {
                          deleteEnvironment(selectedEnv.id);
                          const remaining = environments.filter((e) => e.id !== selectedEnv.id);
                          setSelectedEnvId(remaining[0]?.id || '');
                          notify({ type: 'info', title: 'Environment Deleted' });
                        }
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Environment Name
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <input
                      type="text"
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      placeholder="Optional description"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Environment Variables
                  </p>
                  <KeyValueEditor
                    items={draftVars}
                    onChange={setDraftVars}
                    keyPlaceholder="Variable Name (e.g. baseUrl)"
                    valuePlaceholder="Variable Value"
                    allowSecretToggle={true}
                    emptyLabel="No variables defined in this environment."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Environment</span>
                  </button>
                </div>
              </form>

              {/* Variable Interpolation Tester */}
              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Variable Resolution Preview
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={previewTemplate}
                    onChange={(e) => setPreviewTemplate(e.target.value)}
                    placeholder="{{baseUrl}}/posts/{{userId}}"
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-emerald-700 dark:border-slate-800 dark:bg-[#0D1117] dark:text-emerald-300">
                    <span className="truncate">{liveResolvedPreview}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create Environment Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Create New Environment
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEnv} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  placeholder="e.g., Production"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newEnvDesc}
                  onChange={(e) => setNewEnvDesc(e.target.value)}
                  placeholder="Live production API host"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Create Environment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
