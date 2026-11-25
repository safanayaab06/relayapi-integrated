import React, { useState } from 'react';
import { FolderPlus, Save, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ApiRequestConfig } from '../../types/api';

interface SaveRequestModalProps {
  open: boolean;
  onClose: () => void;
  request: ApiRequestConfig;
}

export const SaveRequestModal: React.FC<SaveRequestModalProps> = ({ open, onClose, request }) => {
  const { collections, createCollection, saveRequestToCollection, notify } = useWorkspace();

  const [requestName, setRequestName] = useState(request.name || 'Untitled Request');
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    request.collectionId || collections[0]?.id || ''
  );
  const [selectedFolderId, setSelectedFolderId] = useState(request.folderId || '');
  const [creatingNewCol, setCreatingNewCol] = useState(collections.length === 0);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  if (!open) return null;

  const activeCollection = collections.find((c) => c.id === selectedCollectionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim()) {
      notify({ type: 'error', title: 'Request Name Required', message: 'Enter a name for this request.' });
      return;
    }

    let targetColId = selectedCollectionId;
    let targetFolderId = selectedFolderId;

    if (creatingNewCol) {
      if (!newColName.trim()) {
        notify({ type: 'error', title: 'Collection Name Required', message: 'Enter a name for the new collection.' });
        return;
      }
      const created = createCollection(newColName, newColDesc);
      targetColId = created.id;
      targetFolderId = '';
    }

    if (!targetColId) {
      notify({ type: 'error', title: 'Select a Collection', message: 'Choose or create a collection.' });
      return;
    }

    saveRequestToCollection(request, targetColId, targetFolderId || undefined, requestName);
    notify({
      type: 'success',
      title: 'Request Saved',
      message: `"${requestName.trim()}" saved to collection.`,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-req-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between">
          <h3 id="save-req-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Save Request to Collection
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Request Name
            </label>
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="e.g., Get User Profile"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Destination Collection
            </span>
            <button
              type="button"
              onClick={() => setCreatingNewCol((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>{creatingNewCol ? 'Select Existing' : 'New Collection'}</span>
            </button>
          </div>

          {creatingNewCol ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  New Collection Name
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g., Auth Service API"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Endpoints for login and tokens"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedCollectionId}
                onChange={(e) => {
                  setSelectedCollectionId(e.target.value);
                  setSelectedFolderId('');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {activeCollection && activeCollection.folders.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Folder (Optional)
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Collection Root</option>
                    {activeCollection.folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              <span>Save Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
