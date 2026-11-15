"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Cloud, Download, File, FileText, FolderOpen, LoaderCircle, Search, Trash2, Upload } from "lucide-react";

type Project = { id: string; name: string };
type StoredFile = { name: string; projectId: string; size: number; createdAt: string; updatedAt: string; mimeType: string };

const BUCKET = "project-documents";
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 150);

export default function ProjectRepository({ projects }: { projects: Project[] }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [userId, setUserId] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setConfigError("Supabase is not configured yet. Add your project URL and anon/publishable key to the Vercel environment variables, then redeploy.");
      setLoading(false);
      return;
    }
    const client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    setSupabase(client);
    client.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      let session = data.session;
      if (!session) {
        const result = await client.auth.signInAnonymously();
        if (result.error) throw result.error;
        session = result.data.session;
      }
      if (session?.user.id) setUserId(session.user.id);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not connect to document storage."))
      .finally(() => setLoading(false));
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    try {
      const all: StoredFile[] = [];
      for (const project of projects) {
        const { data, error } = await supabase.storage.from(BUCKET).list(`${userId}/${project.id}`, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        if (error) throw error;
        for (const item of data ?? []) {
          if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
          all.push({
            name: item.name,
            projectId: project.id,
            size: Number(item.metadata?.size ?? 0),
            createdAt: item.created_at ?? item.updated_at ?? "",
            updatedAt: item.updated_at ?? "",
            mimeType: String(item.metadata?.mimetype ?? "application/octet-stream"),
          });
        }
      }
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setFiles(all);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load project documents.");
    } finally { setLoading(false); }
  }, [supabase, userId, projects]);

  useEffect(() => { if (supabase && userId) void refreshFiles(); }, [supabase, userId, refreshFiles]);

  const usedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const filtered = useMemo(() => files.filter(file => {
    const matchesProject = selectedProject === "all" || file.projectId === selectedProject;
    const matchesQuery = file.name.toLowerCase().includes(query.toLowerCase());
    return matchesProject && matchesQuery;
  }), [files, selectedProject, query]);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !supabase || !userId) return;
    if (!selectedProject || selectedProject === "all") { setMessage("Choose a project before uploading documents."); return; }
    const chosen = Array.from(fileList);
    if (chosen.some(file => file.size > MAX_FILE_BYTES)) { setMessage("Each file must be 50 MB or smaller. You can upload multiple files."); return; }
    const incoming = chosen.reduce((sum, file) => sum + file.size, 0);
    if (usedBytes + incoming > MAX_TOTAL_BYTES) { setMessage("This repository has reached its 1 GB storage limit. Delete files you no longer need before uploading more."); return; }
    setBusy(true); setMessage("");
    try {
      for (const file of chosen) {
        const objectPath = `${userId}/${selectedProject}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (error) throw error;
      }
      setMessage(`${chosen.length} document${chosen.length === 1 ? "" : "s"} uploaded successfully.`);
      await refreshFiles();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function downloadFile(file: StoredFile) {
    if (!supabase || !userId) return;
    const path = `${userId}/${file.projectId}/${file.name}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (error) { setMessage(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteFile(file: StoredFile) {
    if (!supabase || !userId || !confirm(`Delete “${file.name}” permanently?`)) return;
    setBusy(true);
    const path = `${userId}/${file.projectId}/${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) setMessage(error.message);
    else { setMessage("Document deleted."); await refreshFiles(); }
    setBusy(false);
  }

  const projectName = (id: string) => projects.find(project => project.id === id)?.name ?? "Project";

  return <section className="content repository-content">
    <div className="repository-summary panel">
      <div className="repository-summary-icon"><Cloud size={25}/></div>
      <div className="repository-summary-copy"><h3>Project document repository</h3><p>Keep proposals, plans, reports, spreadsheets and other project files together.</p></div>
      <div className="storage-meter"><div className="storage-numbers"><strong>{formatBytes(usedBytes)}</strong><span>of 1 GB used</span></div><div className="storage-track"><div style={{ width: `${Math.min(100, usedBytes / MAX_TOTAL_BYTES * 100)}%` }}/></div><small>{Math.max(0, 100 - usedBytes / MAX_TOTAL_BYTES * 100).toFixed(1)}% available</small></div>
    </div>

    {configError && <div className="repository-alert"><strong>Storage setup required</strong><p>{configError}</p><p>Follow the Supabase setup instructions in the included README. Your existing tasks and projects remain in browser storage.</p></div>}
    {message && <div className="repository-message" role="status">{message}<button onClick={() => setMessage("")}>Dismiss</button></div>}

    {!projects.length ? <div className="panel empty">Create a project first. Documents are stored inside a selected project.</div> : <>
      <div className="repository-toolbar">
        <label className="repository-project-select">Project folder<select value={selectedProject} onChange={event => setSelectedProject(event.target.value)}><option value="all">All projects (select a project to upload)</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className={`repository-upload ${busy || !supabase || !userId || selectedProject === "all" ? "disabled" : ""}`}><Upload size={17}/>{busy ? "Working…" : "Upload documents"}<input type="file" multiple disabled={busy || !supabase || !userId || selectedProject === "all"} onChange={event => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }}/></label>
      </div>
      <div className="panel repository-files-panel">
        <div className="panel-head"><div><h3>Stored documents</h3><p>{filtered.length} file{filtered.length === 1 ? "" : "s"} · private project storage</p></div><div className="searchbox repository-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents…"/></div></div>
        {loading ? <div className="repository-loading"><LoaderCircle className="spin" size={20}/> Loading repository…</div> : filtered.length ? <div className="repository-file-list">{filtered.map(file => <div className="repository-file-row" key={`${file.projectId}/${file.name}`}><div className="repository-file-icon">{file.mimeType.includes("pdf") ? <FileText size={20}/> : <File size={20}/>}</div><div className="repository-file-details"><strong title={file.name}>{file.name.replace(/^\d+-[0-9a-f-]+-/, "")}</strong><small><FolderOpen size={12}/> {projectName(file.projectId)} · {formatBytes(file.size)} · {file.createdAt ? new Date(file.createdAt).toLocaleDateString("en-IN") : "Date unavailable"}</small></div><button className="icon-btn" onClick={() => void downloadFile(file)} title="Open / download document" aria-label="Open document"><Download size={16}/></button><button className="icon-btn danger" onClick={() => void deleteFile(file)} disabled={busy} title="Delete document" aria-label="Delete document"><Trash2 size={16}/></button></div>)}</div> : <div className="empty">No documents found. Choose a project and upload your first file.</div>}
      </div>
    </>}
    <p className="repository-footnote">Storage is private to this browser's anonymous Supabase account. Each upload is limited to 50 MB; total repository usage is capped in the app at 1 GB. Keep a copy of important originals elsewhere too.</p>
  </section>;
}
