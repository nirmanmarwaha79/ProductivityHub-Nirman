"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, FolderKanban, LayoutDashboard, ListTodo, Menu, Plus,
  Search, Settings, Trash2, X, Pencil, ChartNoAxesCombined, Download, RotateCcw, Files
} from "lucide-react";
import ProjectRepository from "@/components/ProjectRepository";

type TaskStatus = "Not started" | "In progress" | "Completed" | "Cancelled";
type Priority = "Low" | "Medium" | "High" | "Urgent";
type ProjectStatus = "Planned" | "Active" | "On hold" | "Completed" | "Archived";
type Task = {
  id: string; title: string; description: string; projectId: string;
  priority: Priority; status: TaskStatus; startAt: string; dueAt: string;
  reminderAt: string; createdAt: string; completedAt: string;
};
type Project = {
  id: string; name: string; description: string; status: ProjectStatus;
  startDate: string; targetDate: string; createdAt: string;
};
type Tab = "Dashboard" | "Tasks" | "Projects" | "Repository" | "Calendar" | "Reminders" | "Reports";

const STORAGE_KEY = "my-productivity-hub-v1";
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random();
const emptyTask = (): Omit<Task,"id"|"createdAt"|"completedAt"> => ({
  title:"", description:"", projectId:"", priority:"Medium", status:"Not started",
  startAt:todayISO(), dueAt:"", reminderAt:""
});
const emptyProject = (): Omit<Project,"id"|"createdAt"> => ({
  name:"", description:"", status:"Active", startDate:todayISO(), targetDate:""
});
const dateLabel = (value: string) => value ? new Date(value + "T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "No date";
const isOverdue = (t: Task) => !!t.dueAt && t.dueAt < todayISO() && t.status !== "Completed" && t.status !== "Cancelled";

export default function Home() {
  const [tab,setTab] = useState<Tab>("Dashboard");
  const [tasks,setTasks] = useState<Task[]>([]);
  const [projects,setProjects] = useState<Project[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [taskModal,setTaskModal] = useState(false);
  const [projectModal,setProjectModal] = useState(false);
  const [editingTask,setEditingTask] = useState<string|null>(null);
  const [editingProject,setEditingProject] = useState<string|null>(null);
  const [taskForm,setTaskForm] = useState(emptyTask());
  const [projectForm,setProjectForm] = useState(emptyProject());
  const [query,setQuery] = useState("");
  const [statusFilter,setStatusFilter] = useState("All");
  const [month,setMonth] = useState(new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [notice,setNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      }
    } catch { setNotice("Could not read saved browser data. You can restore from a JSON backup."); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify({tasks,projects}));
  }, [tasks,projects,loaded]);

  const completed = tasks.filter(t=>t.status==="Completed").length;
  const openTasks = tasks.filter(t=>t.status!=="Completed" && t.status!=="Cancelled");
  const overdue = tasks.filter(isOverdue);
  const dueToday = tasks.filter(t=>t.dueAt===todayISO() && t.status!=="Completed" && t.status!=="Cancelled");
  const activeProjects = projects.filter(p=>p.status==="Active");
  const completion = tasks.length ? Math.round(completed/tasks.length*100) : 0;

  const filteredTasks = useMemo(()=>tasks.filter(t=>{
    const matches = (t.title+" "+t.description).toLowerCase().includes(query.toLowerCase());
    return matches && (statusFilter==="All" || t.status===statusFilter);
  }).sort((a,b)=>(a.dueAt||"9999").localeCompare(b.dueAt||"9999")), [tasks,query,statusFilter]);

  function saveTask() {
    if (!taskForm.title.trim()) return setNotice("Please enter a task title.");
    const now = new Date().toISOString();
    if (editingTask) {
      setTasks(prev=>prev.map(t=>t.id===editingTask ? {...t,...taskForm,completedAt:taskForm.status==="Completed"?(t.completedAt||now):""} : t));
    } else {
      setTasks(prev=>[{...taskForm,id:makeId(),createdAt:now,completedAt:taskForm.status==="Completed"?now:""},...prev]);
    }
    setTaskModal(false); setEditingTask(null); setTaskForm(emptyTask()); setNotice("Task saved.");
  }
  function editTask(t:Task) {
    setEditingTask(t.id); setTaskForm({title:t.title,description:t.description,projectId:t.projectId,priority:t.priority,status:t.status,startAt:t.startAt,dueAt:t.dueAt,reminderAt:t.reminderAt}); setTaskModal(true);
  }
  function removeTask(id:string) {
    if (confirm("Delete this task?")) { setTasks(prev=>prev.filter(t=>t.id!==id)); setNotice("Task deleted."); }
  }
  function saveProject() {
    if (!projectForm.name.trim()) return setNotice("Please enter a project name.");
    if (editingProject) setProjects(prev=>prev.map(p=>p.id===editingProject?{...p,...projectForm}:p));
    else setProjects(prev=>[{...projectForm,id:makeId(),createdAt:new Date().toISOString()},...prev]);
    setProjectModal(false); setEditingProject(null); setProjectForm(emptyProject()); setNotice("Project saved.");
  }
  function editProject(p:Project) {
    setEditingProject(p.id); setProjectForm({name:p.name,description:p.description,status:p.status,startDate:p.startDate,targetDate:p.targetDate}); setProjectModal(true);
  }
  function removeProject(id:string) {
    if (confirm("Delete this project? Tasks will become unassigned. Any cloud documents in its repository folder will remain stored but will no longer appear in the app.")) {
      setProjects(prev=>prev.filter(p=>p.id!==id)); setTasks(prev=>prev.map(t=>t.projectId===id?{...t,projectId:""}:t)); setNotice("Project deleted.");
    }
  }
  function toggleComplete(t:Task) {
    const next:TaskStatus = t.status==="Completed"?"Not started":"Completed";
    setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:next,completedAt:next==="Completed"?new Date().toISOString():""}:x));
  }
  function projectProgress(id:string) {
    const related=tasks.filter(t=>t.projectId===id && t.status!=="Cancelled");
    return related.length?Math.round(related.filter(t=>t.status==="Completed").length/related.length*100):0;
  }
  function exportBackup() {
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks,projects},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="my-productivity-hub-backup.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importBackup(file?:File) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{try{const d=JSON.parse(String(reader.result));if(!Array.isArray(d.tasks)||!Array.isArray(d.projects))throw new Error();if(confirm("Replace current data with this backup?")){setTasks(d.tasks);setProjects(d.projects);setNotice("Backup restored.");}}catch{setNotice("Invalid backup file.");}};
    reader.readAsText(file);
  }
  function askNotificationPermission() {
    if (!("Notification" in window)) return setNotice("This browser does not support notifications.");
    Notification.requestPermission().then(p=>setNotice(p==="granted"?"Browser notifications enabled.":"Notification permission was not granted."));
  }

  useEffect(()=>{
    if(!loaded || !("Notification" in window) || Notification.permission!=="granted")return;
    const due=tasks.filter(t=>t.reminderAt && t.status!=="Completed" && new Date(t.reminderAt).getTime()<=Date.now());
    due.forEach(t=>{
      const key="mph-notified-"+t.id;
      if(!sessionStorage.getItem(key)){new Notification("Task reminder",{body:t.title});sessionStorage.setItem(key,"1");}
    });
  },[tasks,loaded]);

  const nav: {name:Tab;icon:typeof LayoutDashboard}[]=[
    {name:"Dashboard",icon:LayoutDashboard},{name:"Tasks",icon:ListTodo},{name:"Projects",icon:FolderKanban},{name:"Repository",icon:Files},
    {name:"Calendar",icon:CalendarDays},{name:"Reminders",icon:Bell},{name:"Reports",icon:ChartNoAxesCombined}
  ];
  const projectName=(id:string)=>projects.find(p=>p.id===id)?.name||"Personal / unassigned";
  const taskRows=(items:Task[])=>items.length?items.map(t=><div className="task-row" key={t.id}>
    <button className={`check ${t.status==="Completed"?"checked":""}`} onClick={()=>toggleComplete(t)} aria-label="Toggle completed">{t.status==="Completed"&&<Check size={14}/>}</button>
    <div className="task-main"><button className={`task-title ${t.status==="Completed"?"muted strike":""}`} onClick={()=>editTask(t)}>{t.title}</button><div className="task-meta">{projectName(t.projectId)} {t.dueAt&&`· Due ${dateLabel(t.dueAt)}`}</div></div>
    <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
    <span className={`status ${t.status.toLowerCase().replace(" ","-")}`}>{t.status}</span>
    <button className="icon-btn" onClick={()=>editTask(t)} aria-label="Edit task"><Pencil size={15}/></button>
    <button className="icon-btn danger" onClick={()=>removeTask(t.id)} aria-label="Delete task"><Trash2 size={15}/></button>
  </div>):<div className="empty">Nothing here yet. Add a task to get started.</div>;

  const firstDay=new Date(month.getFullYear(),month.getMonth(),1).getDay();
  const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const calendarCells=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const monthKey=(d:number)=>`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  if(!loaded)return <div className="loading">Loading your productivity hub…</div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={20}/></div><div><strong>FocusFlow</strong><small>Personal workspace</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n=><button key={n.name} onClick={()=>setTab(n.name)} className={`nav-item ${tab===n.name?"active":""}`}><n.icon size={18}/><span>{n.name}</span>{n.name==="Tasks"&&<em>{openTasks.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">Y</div><div><strong>Your workspace</strong><small>Personal account</small></div></div><button className="nav-item" onClick={()=>setTab("Reports")}><Settings size={18}/> Settings & data</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">PERSONAL PRODUCTIVITY</div><h1>{tab}</h1></div><div className="top-actions"><button className="secondary-btn" onClick={exportBackup}><Download size={16}/> Backup</button>{tab!=="Repository"&&<button className="primary-btn" onClick={()=>{if(tab==="Projects"){setEditingProject(null);setProjectForm(emptyProject());setProjectModal(true);}else{setEditingTask(null);setTaskForm(emptyTask());setTaskModal(true);}}}><Plus size={17}/> {tab==="Projects"?"New project":"New task"}</button>}</div></header>
      {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
      {tab==="Dashboard"&&<section className="content">
        <div className="welcome"><div><h2>Make today count.</h2><p>Here's your productivity snapshot for {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}.</p></div><div className="welcome-icon"><Activity size={30}/></div></div>
        <div className="stats-grid">
          <Stat icon={<ListTodo/>} label="Open tasks" value={openTasks.length} tone="blue"/>
          <Stat icon={<CheckCircle2/>} label="Completed" value={completed} tone="green"/>
          <Stat icon={<CircleAlert/>} label="Overdue" value={overdue.length} tone="red"/>
          <Stat icon={<FolderKanban/>} label="Active projects" value={activeProjects.length} tone="purple"/>
        </div>
        <div className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h3>Today's focus</h3><p>{dueToday.length} tasks due today</p></div><button className="text-btn" onClick={()=>setTab("Tasks")}>View all</button></div>{taskRows([...dueToday,...openTasks.filter(t=>!dueToday.includes(t)).slice(0,4)].slice(0,5))}</div>
        <div className="panel progress-panel"><div className="panel-head"><div><h3>Overall progress</h3><p>Across all tasks</p></div><span className="progress-number">{completion}%</span></div><div className="progress-track"><div className="progress-fill" style={{width:completion+"%"}}/></div><div className="progress-foot"><span>{completed} completed</span><span>{tasks.length} total tasks</span></div><div className="mini-stats"><div><strong>{overdue.length}</strong><span>Overdue</span></div><div><strong>{openTasks.length}</strong><span>Remaining</span></div></div></div></div>
        <div className="panel"><div className="panel-head"><div><h3>Project overview</h3><p>Progress across your active projects</p></div><button className="text-btn" onClick={()=>setTab("Projects")}>All projects</button></div>
          {projects.filter(p=>p.status!=="Archived").slice(0,4).length?projects.filter(p=>p.status!=="Archived").slice(0,4).map(p=><div className="project-progress" key={p.id}><div><strong>{p.name}</strong><small>{tasks.filter(t=>t.projectId===p.id).length} tasks · {p.status}</small></div><div className="project-bar"><div style={{width:projectProgress(p.id)+"%"}}/></div><b>{projectProgress(p.id)}%</b></div>):<div className="empty">Create a project to see its progress here.</div>}
        </div>
      </section>}
      {tab==="Tasks"&&<section className="content"><div className="toolbar"><div className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks…"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option>Not started</option><option>In progress</option><option>Completed</option><option>Cancelled</option></select></div><div className="panel"><div className="panel-head"><div><h3>All tasks</h3><p>{filteredTasks.length} matching tasks</p></div></div>{taskRows(filteredTasks)}</div></section>}
      {tab==="Projects"&&<section className="content"><div className="project-grid">{projects.map(p=><div className="panel project-card" key={p.id}><div className="project-card-head"><div className="project-symbol"><FolderKanban/></div><span className={`status ${p.status.toLowerCase().replace(" ","-")}`}>{p.status}</span></div><h3>{p.name}</h3><p>{p.description||"No description added."}</p><div className="project-bar"><div style={{width:projectProgress(p.id)+"%"}}/></div><div className="project-card-foot"><span>{projectProgress(p.id)}% complete</span><span>{tasks.filter(t=>t.projectId===p.id).length} tasks</span></div><div className="card-actions"><button className="secondary-btn" onClick={()=>editProject(p)}><Pencil size={14}/> Edit</button><button className="icon-btn danger" onClick={()=>removeProject(p.id)}><Trash2 size={15}/></button></div></div>)}</div>{!projects.length&&<div className="panel empty">No projects yet. Create your first project.</div>}</section>}
      {tab==="Repository"&&<ProjectRepository projects={projects.map(({id,name})=>({id,name}))}/> }
      {tab==="Calendar"&&<section className="content"><div className="panel"><div className="calendar-head"><button className="icon-btn" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft/></button><h3>{month.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</h3><button className="icon-btn" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight/></button><button className="text-btn" onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Today</button></div><div className="calendar-grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div className="weekday" key={d}>{d}</div>)}{calendarCells.map((d,i)=><div className={`calendar-day ${d&&monthKey(d)===todayISO()?"today":""}`} key={i}>{d&&<><span>{d}</span>{tasks.filter(t=>t.dueAt===monthKey(d)).slice(0,3).map(t=><button className={`calendar-event ${t.priority.toLowerCase()}`} key={t.id} onClick={()=>editTask(t)}>{t.title}</button>)}{tasks.filter(t=>t.dueAt===monthKey(d)).length>3&&<small>+ more</small>}</>}</div>)}</div></div></section>}
      {tab==="Reminders"&&<section className="content"><div className="panel"><div className="panel-head"><div><h3>Task reminders</h3><p>Reminders are checked while this app is open.</p></div><button className="secondary-btn" onClick={askNotificationPermission}><Bell size={15}/> Enable notifications</button></div>{tasks.filter(t=>t.reminderAt&&t.status!=="Completed").sort((a,b)=>a.reminderAt.localeCompare(b.reminderAt)).map(t=><div className="task-row" key={t.id}><Bell size={17} className="reminder-icon"/><div className="task-main"><button className="task-title" onClick={()=>editTask(t)}>{t.title}</button><div className="task-meta">{new Date(t.reminderAt).toLocaleString("en-IN")} · {projectName(t.projectId)}</div></div><span className="status">{new Date(t.reminderAt).getTime()<Date.now()?"Due":"Upcoming"}</span></div>)}{!tasks.some(t=>t.reminderAt&&t.status!=="Completed")&&<div className="empty">No reminders yet. Add a reminder when creating or editing a task.</div>}</div></section>}
      {tab==="Reports"&&<section className="content"><div className="stats-grid"><Stat icon={<ListTodo/>} label="Total tasks" value={tasks.length} tone="blue"/><Stat icon={<CheckCircle2/>} label="Completed" value={completed} tone="green"/><Stat icon={<CircleAlert/>} label="Overdue" value={overdue.length} tone="red"/><Stat icon={<FolderKanban/>} label="Projects" value={projects.length} tone="purple"/></div><div className="panel"><div className="panel-head"><div><h3>Task status breakdown</h3><p>Current distribution of your tasks</p></div></div>{(["Not started","In progress","Completed","Cancelled"] as TaskStatus[]).map(s=>{const count=tasks.filter(t=>t.status===s).length;return <div className="report-row" key={s}><span>{s}</span><div className="report-track"><div style={{width:(tasks.length?count/tasks.length*100:0)+"%"}}/></div><strong>{count}</strong></div>})}</div><div className="panel"><div className="panel-head"><div><h3>Data management</h3><p>Download a backup or restore your saved data.</p></div></div><div className="data-actions"><button className="secondary-btn" onClick={exportBackup}><Download size={16}/> Export backup</button><label className="secondary-btn upload-btn"><RotateCcw size={16}/> Restore backup<input type="file" accept="application/json" onChange={e=>importBackup(e.target.files?.[0])}/></label></div><p className="hint">Your data is stored in this browser. Export backups regularly.</p></div></section>}
      <footer className="footer">FocusFlow · Personal productivity workspace · Tasks and projects stay in this browser; project documents use private cloud storage</footer>
    </main>

    {taskModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setTaskModal(false)}}><div className="modal"><div className="modal-head"><div><h2>{editingTask?"Edit task":"Create a task"}</h2><p>Capture the details and keep moving forward.</p></div><button className="icon-btn" onClick={()=>setTaskModal(false)}><X/></button></div><div className="form-grid"><label className="full">Task title *<input autoFocus value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="e.g. Prepare project proposal"/></label><label className="full">Description<textarea value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})} placeholder="Add details…"/></label><label>Project<select value={taskForm.projectId} onChange={e=>setTaskForm({...taskForm,projectId:e.target.value})}><option value="">Personal / unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as Priority})}>{["Low","Medium","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select value={taskForm.status} onChange={e=>setTaskForm({...taskForm,status:e.target.value as TaskStatus})}>{["Not started","In progress","Completed","Cancelled"].map(x=><option key={x}>{x}</option>)}</select></label><label>Start date<input type="date" value={taskForm.startAt} onChange={e=>setTaskForm({...taskForm,startAt:e.target.value})}/></label><label>Due date<input type="date" value={taskForm.dueAt} onChange={e=>setTaskForm({...taskForm,dueAt:e.target.value})}/></label><label>Reminder date & time<input type="datetime-local" value={taskForm.reminderAt} onChange={e=>setTaskForm({...taskForm,reminderAt:e.target.value})}/></label></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setTaskModal(false)}>Cancel</button><button className="primary-btn" onClick={saveTask}>Save task</button></div></div></div>}
    {projectModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setProjectModal(false)}}><div className="modal"><div className="modal-head"><div><h2>{editingProject?"Edit project":"Create a project"}</h2><p>Give your work a clear destination.</p></div><button className="icon-btn" onClick={()=>setProjectModal(false)}><X/></button></div><div className="form-grid"><label className="full">Project name *<input autoFocus value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})} placeholder="e.g. Website redesign"/></label><label className="full">Description<textarea value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})} placeholder="What does success look like?"/></label><label>Status<select value={projectForm.status} onChange={e=>setProjectForm({...projectForm,status:e.target.value as ProjectStatus})}>{["Planned","Active","On hold","Completed","Archived"].map(x=><option key={x}>{x}</option>)}</select></label><label>Start date<input type="date" value={projectForm.startDate} onChange={e=>setProjectForm({...projectForm,startDate:e.target.value})}/></label><label>Target date<input type="date" value={projectForm.targetDate} onChange={e=>setProjectForm({...projectForm,targetDate:e.target.value})}/></label></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setProjectModal(false)}>Cancel</button><button className="primary-btn" onClick={saveProject}>Save project</button></div></div></div>}
  </div>;
}

function Stat({icon,label,value,tone}:{icon:React.ReactNode;label:string;value:number;tone:string}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}
