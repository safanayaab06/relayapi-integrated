import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Folder,
  FolderKanban,
  FolderPlus,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { MethodBadge } from '../components/common/MethodBadge';
import { useWorkspace } from '../context/WorkspaceContext';
import { Collection, HttpMethod, SavedRequest } from '../types/api';
import { createEmptyRequest, createId } from '../utils/requestUtils';

export const CollectionsPage: React.FC = () => {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    addFolderToCollection,
    deleteFolderFromCollection,
    saveRequestToCollection,
    deleteRequestFromCollection,
    loadRequestIntoBuilder,
    requestConfirm,
    notify,
  } = useWorkspace();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(collections.map((c) => [c.id, true]))
  );
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Create/Edit Collection Modal state
  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');

  // Add Folder Modal state
  const [folderModalColId, setFolderModalColId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');

  // Quick Add/Edit Request Modal state
  const [reqModalState, setReqModalState] = useState<{
    open: boolean;
    collectionId: string;
    folderId?: string;
    editingReq?: SavedRequest;
  }>({ open: false, collectionId: '' });
  const [reqName, setReqName] = useState('');
  const [reqMethod, setReqMethod] = useState<HttpMethod>('GET');
  const [reqUrl, setReqUrl] = useState('');

  const toggleCol = (id: string) =>
    setExpandedCols((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections
      .map((col) => {
        const colMatches =
          col.name.toLowerCase().includes(q) || col.description.toLowerCase().includes(q);
        const matchingRootReqs = col.requests.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.url.toLowerCase().includes(q) ||
            r.method.toLowerCase().includes(q)
        );
        const matchingFolders = col.folders
          .map((f) => ({
            ...f,
            requests: f.requests.filter(
              (r) =>
                r.name.toLowerCase().includes(q) ||
                r.url.toLowerCase().includes(q) ||
                r.method.toLowerCase().includes(q)
            ),
          }))
          .filter((f) => f.name.toLowerCase().includes(q) || f.requests.length > 0);

        if (colMatches) return col;
        if (matchingRootReqs.length > 0 || matchingFolders.length > 0) {
          return { ...col, requests: matchingRootReqs, folders: matchingFolders };
        }
        return null;
      })
      .filter((c): c is Collection => c !== null);
  }, [collections, searchQuery]);

  const openNewCollectionModal = () => {
    setEditingCollection(null);
    setColName('');
    setColDesc('');
    setColModalOpen(true);
  };

  const openEditCollectionModal = (col: Collection) => {
    setEditingCollection(col);
    setColName(col.name);
    setColDesc(col.description);
    setColModalOpen(true);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) {
      notify({ type: 'error', title: 'Collection Name Required' });
      return;
    }
    if (editingCollection) {
      updateCollection({
        ...editingCollection,
        name: colName.trim(),
        description: colDesc.trim(),
      });
      notify({ type: 'success', title: 'Collection Updated' });
    } else {
      const created = createCollection(colName, colDesc);
      setExpandedCols((prev) => ({ ...prev, [created.id]: true }));
      notify({ type: 'success', title: 'Collection Created' });
    }
    setColModalOpen(false);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderModalColId || !folderName.trim()) return;
    addFolderToCollection(folderModalColId, folderName);
    setExpandedCols((prev) => ({ ...prev, [folderModalColId]: true }));
    setFolderModalColId(null);
    setFolderName('');
    notify({ type: 'success', title: 'Folder Created' });
  };

  const openRequestModal = (collectionId: string, folderId?: string, req?: SavedRequest) => {
    setReqModalState({ open: true, collectionId, folderId, editingReq: req });
    setReqName(req?.name || '');
    setReqMethod(req?.method || 'GET');
    setReqUrl(req?.url || '{{baseUrl}}/');
  };

  const handleSaveRequestModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim() || !reqUrl.trim()) {
      notify({ type: 'error', title: 'Name and URL are required' });
      return;
    }
    const base = reqModalState.editingReq || { ...createEmptyRequest(), id: createId('req') };
    saveRequestToCollection(
      { ...base, name: reqName.trim(), method: reqMethod, url: reqUrl.trim() },
      reqModalState.collectionId,
      reqModalState.folderId,
      reqName.trim()
    );
    setReqModalState({ open: false, collectionId: '' });
    notify({
      type: 'success',
      title: reqModalState.editingReq ? 'Request Updated' : 'Request Added',
    });
  };

  const renderRequestRow = (col: Collection, req: SavedRequest, folderId?: string) => (
    <div
      key={req.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900"
    >
      <button
        type="button"
        onClick={() => {
          loadRequestIntoBuilder(req);
          navigate('/client');
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <MethodBadge method={req.method} className="w-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
            {req.name}
          </p>
          <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{req.url}</p>
        </div>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            loadRequestIntoBuilder(req);
            navigate('/client');
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Send className="h-3 w-3" />
          <span>Load</span>
        </button>
        <button
          type="button"
          onClick={() => openRequestModal(col.id, folderId, req)}
          aria-label={`Edit ${req.name}`}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            requestConfirm(
              {
                title: 'Delete Saved Request',
                message: `Are you sure you want to delete "${req.name}" from "${col.name}"?`,
                confirmLabel: 'Delete Request',
              },
              () => {
                deleteRequestFromCollection(col.id, req.id, folderId);
                notify({ type: 'info', title: 'Request Deleted' });
              }
            )
          }
          aria-label={`Delete ${req.name}`}
          className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Collections Management
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Organize saved REST endpoints into collections and folders, edit requests, or launch sequential runner executions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections or URLs..."
              aria-label="Search collections and requests"
              className="w-56 rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-8 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={openNewCollectionModal}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Collection</span>
          </button>
        </div>
      </section>

      {/* Collections List */}
      {filteredCollections.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={searchQuery ? 'No matching collections or requests' : 'No collections created yet'}
          description={
            searchQuery
              ? 'Try clearing your search query to view all saved collections.'
              : 'Create a collection to group related API requests and run them together in the Collection Runner.'
          }
          actionLabel={searchQuery ? 'Clear Search' : 'Create First Collection'}
          onAction={searchQuery ? () => setSearchQuery('') : openNewCollectionModal}
        />
      ) : (
        <div className="space-y-4">
          {filteredCollections.map((col) => {
            const isExpanded = expandedCols[col.id] ?? true;
            const totalReqCount =
              col.requests.length + col.folders.reduce((acc, f) => acc + f.requests.length, 0);

            return (
              <section
                key={col.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]"
              >
                {/* Collection Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleCol(col.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="mt-0.5 text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {col.name}
                        </h3>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {totalReqCount} {totalReqCount === 1 ? 'request' : 'requests'}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {col.folders.length} {col.folders.length === 1 ? 'folder' : 'folders'}
                        </span>
                      </div>
                      {col.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/runner?collection=${col.id}`)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Play className="h-3 w-3" />
                      <span>Run</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openRequestModal(col.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFolderModalColId(col.id);
                        setFolderName('');
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <FolderPlus className="h-3 w-3" />
                      <span>Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditCollectionModal(col)}
                      aria-label={`Edit ${col.name}`}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          {
                            title: 'Delete Collection',
                            message: `Delete "${col.name}" and all ${totalReqCount} saved requests inside it? This cannot be undone.`,
                            confirmLabel: 'Delete Collection',
                          },
                          () => {
                            deleteCollection(col.id);
                            notify({ type: 'info', title: 'Collection Deleted' });
                          }
                        )
                      }
                      aria-label={`Delete ${col.name}`}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                    {/* Folders */}
                    {col.folders.map((folder) => {
                      const fExpanded = expandedFolders[folder.id] ?? true;
                      return (
                        <div
                          key={folder.id}
                          className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFolder(folder.id)}
                              className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                            >
                              {fExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{folder.name}</span>
                              <span className="font-mono font-normal text-slate-500 tabular-nums">
                                ({folder.requests.length})
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openRequestModal(col.id, folder.id)}
                                className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                              >
                                + Request
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  requestConfirm(
                                    {
                                      title: 'Delete Folder',
                                      message: `Delete folder "${folder.name}" and its ${folder.requests.length} requests?`,
                                      confirmLabel: 'Delete Folder',
                                    },
                                    () => {
                                      deleteFolderFromCollection(col.id, folder.id);
                                      notify({ type: 'info', title: 'Folder Deleted' });
                                    }
                                  )
                                }
                                aria-label={`Delete folder ${folder.name}`}
                                className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {fExpanded && (
                            <div className="mt-3 space-y-2">
                              {folder.requests.length === 0 ? (
                                <p className="py-2 text-center text-xs text-slate-500">
                                  No requests in this folder yet.
                                </p>
                              ) : (
                                folder.requests.map((r) => renderRequestRow(col, r, folder.id))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Root Requests */}
                    {col.requests.length > 0 && (
                      <div className="space-y-2">
                        {col.requests.map((r) => renderRequestRow(col, r))}
                      </div>
                    )}

                    {col.folders.length === 0 && col.requests.length === 0 && (
                      <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        This collection is empty. Add a request or folder to get started.
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Collection Create/Edit Modal */}
      {colModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingCollection ? 'Edit Collection' : 'Create Collection'}
              </h3>
              <button
                type="button"
                onClick={() => setColModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCollection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="e.g., E-Commerce Orders API"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={colDesc}
                  onChange={(e) => setColDesc(e.target.value)}
                  placeholder="Brief summary of endpoints in this collection"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  {editingCollection ? 'Save Changes' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Create Modal */}
      {folderModalColId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Create Folder
            </h3>
            <form onSubmit={handleSaveFolder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Authentication"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFolderModalColId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Quick Edit/Add Modal */}
      {reqModalState.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {reqModalState.editingReq ? 'Edit Saved Request' : 'Add Request to Collection'}
            </h3>
            <form onSubmit={handleSaveRequestModal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Request Name
                </label>
                <input
                  type="text"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="e.g., Fetch Orders"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Method
                  </label>
                  <select
                    value={reqMethod}
                    onChange={(e) => setReqMethod(e.target.value as HttpMethod)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={reqUrl}
                    onChange={(e) => setReqUrl(e.target.value)}
                    placeholder="{{baseUrl}}/orders"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReqModalState({ open: false, collectionId: '' })}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
