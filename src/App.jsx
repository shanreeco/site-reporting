import React, { useEffect, useMemo, useState, Suspense } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

/**
 * Construction Site Reporting Dashboard – Cloud + Demo Mode
 * - Demo Mode prevents long preview hangs when Supabase env vars are missing
 * - Unix 
 CSV endings
 * - Public URLs for photos (in cloud). In demo, object URLs are used.
 * - All users treated as ADMIN in demo (per your confirmation)
 */

// --------- SUPABASE ---------
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const supabaseAnon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR-ANON-KEY";
const SUPABASE_CONFIGURED = !supabaseUrl.includes("YOUR-PROJECT") && supabaseAnon !== "YOUR-ANON-KEY";
export const supabase = SUPABASE_CONFIGURED ? createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, autoRefreshToken: true },
}) : null;
const DEMO = !SUPABASE_CONFIGURED; // demo when no env vars

// --------- Utils ---------
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function toCSV(rows, headerOrder) {
  if (!rows || rows.length === 0) return "";
  const headers = headerOrder ?? Object.keys(rows[0]);
  const esc = (v) => { const s = v == null ? "" : String(v); return (s.includes(",") || s.includes("
") || s.includes('"')) ? '"' + s.replaceAll('"', '""') + '"' : s; };
  const out = [headers.join(",")];
  for (const r of rows) out.push(headers.map(h=>esc(r[h])).join(","));
  return out.join("
"); // Unix line endings
}
const todayStr = () => new Date().toISOString().slice(0,10);

// --------- Auth + Role context ---------
function useSessionProfile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // {id,email,role}

  useEffect(()=>{
    if (DEMO) {
      const demoUser = { id: "demo-user", email: "demo@local" };
      setSession({ user: demoUser });
      setProfile({ id: demoUser.id, email: demoUser.email, role: "admin" }); // all admin in demo
      return;
    }
    supabase.auth.getSession().then(({data})=> setSession(data.session||null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> sub?.subscription?.unsubscribe();
  },[]);

  useEffect(()=>{
    if (DEMO) return;
    (async()=>{
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase.from("profiles").select("id,email,role").eq("id", session.user.id).single();
      if (!error) setProfile(data);
    })();
  }, [session?.user?.id]);

  return { session, profile, isAdmin: profile?.role === "admin" };
}

// --------- Data hook (cloud or demo localStorage) ---------
function useTable(table) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    if (DEMO) {
      const raw = localStorage.getItem(`demo_${table}`);
      setRows(raw ? JSON.parse(raw) : []); setLoading(false); return;
    }
    fetchRows();
    const channel = supabase.channel(`${table}-changes`).on('postgres_changes', {event:'*', schema:'public', table}, ()=> fetchRows()).subscribe();
    return ()=> supabase.removeChannel(channel);
  },[]);

  function saveDemo(next){ localStorage.setItem(`demo_${table}`, JSON.stringify(next)); setRows(next); }

  async function fetchRows(){
    setLoading(true);
    const { data, error } = await supabase.from(table).select("*").order('created_at', {ascending:false});
    setError(error?.message||null); setRows(data||[]); setLoading(false);
  }
  async function insert(row){
    if (DEMO) { const r = { ...row, id: crypto.randomUUID?.() || uid(), created_at: new Date().toISOString() }; saveDemo([r, ...rows]); return; }
    const { error } = await supabase.from(table).insert(row); if (error) alert(error.message);
  }
  async function remove(id){
    if (DEMO) { saveDemo(rows.filter(r=>r.id!==id)); return; }
    const { error } = await supabase.from(table).delete().eq('id', id); if (error) alert(error.message);
  }
  async function clearAll(){
    if (DEMO) { saveDemo([]); return; }
    const { error } = await supabase.from(table).delete().neq('id','00000000-0000-0000-0000-000000000000'); if (error) alert(error.message);
  }
  return { rows, loading, error, insert, remove, clearAll };
}

// --------- File upload helpers ---------
async function uploadToBucket(bucket, file){
  if (DEMO) return URL.createObjectURL(file); // local preview
  const ext = file.name.split('.').pop(); const path = `${Date.now()}_${uid()}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert:false });
  if (error) throw error; return data.path;
}
async function getPublicUrl(bucket, path){
  if (DEMO) return path; // object URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path); return data.publicUrl; // public URL per your preference
}

// --------- App ---------
export default function App(){
  const { session, profile, isAdmin } = useSessionProfile();
  const [tab, setTab] = useState("dashboard");
  const [fromDate, setFromDate] = useState(""); const [toDate, setToDate] = useState("");
  if (!session) return (<AuthScreen />);
  if (!profile) return <Centered>Loading profile…</Centered>;

  const inRange = (iso)=>{ if (!iso) return true; const d=new Date(iso); if (fromDate && d < new Date(fromDate)) return false; if (toDate && d>new Date(toDate)) return false; return true; };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white grid place-items-center font-bold">SR</div>
          <div>
            <h1 className="text-xl font-semibold">Construction Site Reporting {DEMO ? '(Demo)' : '(Cloud)'} </h1>
            <p className="text-xs text-neutral-500">{DEMO ? 'DEMO MODE (local only) · ' : ''}Signed in as {profile.email} · Role: {profile.role}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && <button onClick={()=>window.open('#/report','_blank')} className="px-3 py-1.5 rounded-lg border">Open Daily Report</button>}
            {!DEMO && <button onClick={()=>supabase.auth.signOut()} className="px-3 py-1.5 rounded-lg border">Sign out</button>}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4">
        <nav className="flex gap-2 flex-wrap">
          {[["dashboard","Dashboard"],["concrete","Concrete Casting Log"],["manpower","Daily Manpower Log"],["issues","Daily Issue Log"],["materials","Material Req/Delivery Log"],["report","Printable Report"]].map(([k,l])=> (
            <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1.5 rounded-full border ${tab===k?"bg-neutral-900 text-white":"bg-white hover:bg-neutral-100"}`}>{l}</button>
          ))}
        </nav>

        <section className="mt-4 grid md:grid-cols-3 gap-3 items-end">
          <div><label className="text-xs text-neutral-500">From date</label><input value={fromDate} onChange={e=>setFromDate(e.target.value)} type="date" className="w-full border rounded-lg px-3 py-2" /></div>
          <div><label className="text-xs text-neutral-500">To date</label><input value={toDate} onChange={e=>setToDate(e.target.value)} type="date" className="w-full border rounded-lg px-3 py-2" /></div>
          <div className="flex gap-2"><button onClick={()=>{setFromDate("");setToDate("");}} className="px-3 py-2 border rounded-lg">Reset Dates</button></div>
        </section>

        <main className="mt-6">
          <Suspense fallback={<Centered>Loading…</Centered>}>
            {tab==="dashboard" && <Dashboard isAdmin={isAdmin} inRange={inRange} />}
            {tab==="concrete" && <ConcreteLog isAdmin={isAdmin} inRange={inRange} />}
            {tab==="manpower" && <ManpowerLog isAdmin={isAdmin} inRange={inRange} />}
            {tab==="issues" && <IssuesLog isAdmin={isAdmin} inRange={inRange} />}
            {tab==="materials" && <MaterialsLog isAdmin={isAdmin} inRange={inRange} />}
            {tab==="report" && <PrintableReport inRange={inRange} />}
          </Suspense>
        </main>

        <footer className="py-8 text-xs text-neutral-500">{DEMO ? 'Demo mode: data lives in your browser. Add Supabase env vars for cloud sync.' : 'Cloud data via Supabase free tier. CSV export is admin-only. Records persist until an admin clears them.'}</footer>
      </div>
    </div>
  );
}

// ---------- Auth ----------
function AuthScreen(){
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const send = async ()=>{ if (DEMO) return alert('Demo mode: click Use demo below'); const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin }}); if (!error) setSent(true); else alert(error.message); };
  const useDemo = ()=> location.reload();
  return (
    <Centered>
      <div className="max-w-sm w-full bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Sign in</h2>
        <p className="text-sm text-neutral-500 mb-4">{DEMO ? 'Preview is in demo (no cloud). Provide Supabase URL & anon key to enable cloud.' : 'Enter your email to receive a one-time login link.'}</p>
        {!DEMO && (<>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="name@company.com" className="w-full border rounded-lg px-3 py-2 mb-3" />
          <button onClick={send} className="w-full px-3 py-2 rounded-lg bg-neutral-900 text-white">Send magic link</button>
          {sent && <p className="text-xs text-green-700 mt-3">Check your inbox for the login link.</p>}
        </>)}
        {DEMO && (<button onClick={useDemo} className="w-full px-3 py-2 rounded-lg bg-neutral-900 text-white">Use demo</button>)}
      </div>
    </Centered>
  );
}
function Centered({children}){ return <div className="min-h-screen grid place-items-center bg-neutral-50">{children}</div>; }

// ---------- Reusable UI ----------
function Card({title, children}){return (<div className="bg-white border rounded-2xl p-4 shadow-sm">{title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}{children}</div>);} 
function FormGrid({children}){return <div className="grid grid-cols-1 gap-2">{children}</div>;}
function Input({label, value, onChange, type="text"}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-300" /></label>);} 
function TextArea({label, value, onChange}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><textarea value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-neutral-300" /></label>);} 
function Select({label, value, onChange, options}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><select value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white"><option value="">-- Select --</option>{options.map(opt=> <option key={opt} value={opt}>{opt}</option>)}</select></label>);} 
function DataTable({columns, rows, onDelete}){
  const [q, setQ] = useState("");
  const filtered = useMemo(()=>{ if (!q) return rows; const s=q.toLowerCase(); return rows.filter(r=> Object.values(r).some(v=> String(v??"").toLowerCase().includes(s))); }, [q, rows]);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="border rounded-lg px-3 py-2 w-full md:w-64" /><span className="text-xs text-neutral-500">{filtered.length} shown</span></div>
      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm"><thead className="bg-neutral-50"><tr>{columns.map(c=> <th key={c} className="text-left px-3 py-2 border-b whitespace-nowrap capitalize">{c.replaceAll('_',' ')}</th>)}<th className="px-3 py-2 border-b text-right">Actions</th></tr></thead>
          <tbody>
            {filtered.map(r=> (<tr key={r.id} className="odd:bg-white even:bg-neutral-50">{columns.map(c=> (<td key={c} className="px-3 py-2 border-b align-top whitespace-pre-wrap">{String(r[c]??'')}</td>))}<td className="px-3 py-2 border-b text-right"><button onClick={()=>onDelete(r.id)} className="text-red-600 hover:underline">Delete</button></td></tr>))}
            {filtered.length===0 && (<tr><td colSpan={columns.length+1} className="px-3 py-6 text-center text-neutral-500">No data</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Charts Dashboard ----------
function Dashboard({isAdmin, inRange}){
  const { rows: concrete } = useTable("concrete");
  const { rows: manpower } = useTable("manpower");
  const { rows: issues } = useTable("issues");
  const c = concrete.filter(r=>inRange(r.date));
  const m = manpower.filter(r=>inRange(r.date));
  const i = issues.filter(r=>inRange(r.date));
  const totalVolume = c.reduce((s,r)=> s + (+r.volume||0), 0);
  const totalWorkers = m.reduce((s,r)=> s + (+r.workers||0), 0);
  const openIssues = i.filter(r=> (r.status||"").toLowerCase() !== 'closed').length;
  const byDateVolume = Object.values(c.reduce((a,r)=>{const d=r.date;a[d]=a[d]||{date:d,m3:0};a[d].m3+=(+r.volume||0);return a;},{})).sort((a,b)=>a.date.localeCompare(b.date));
  const byDateWorkers = Object.values(m.reduce((a,r)=>{const d=r.date;a[d]=a[d]||{date:d,workers:0};a[d].workers+=(+r.workers||0);return a;},{})).sort((a,b)=>a.date.localeCompare(b.date));
  const bySeverity = Object.values(i.reduce((a,r)=>{const s=r.severity||'Unknown';a[s]=a[s]||{name:s,count:0};a[s].count++;return a;},{}));
  return (
    <div className="grid gap-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Pours recorded" value={c.length} sub={`${totalVolume.toFixed(2)} m³ total`} />
        <Stat label="Manpower entries" value={m.length} sub={`${totalWorkers} workers total`} />
        <Stat label="Open issues" value={openIssues} />
        <Stat label="Admin tools" value={isAdmin?"Enabled":"—"} />
      </div>
      <Card title="Daily Concrete Volume (m³)"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={byDateVolume} margin={{left:8,right:8,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="m3" dot={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card title="Daily Total Workers"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={byDateWorkers} margin={{left:8,right:8,top:8,bottom:8}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="workers" /></BarChart></ResponsiveContainer></div></Card>
      <Card title="Open Issues by Severity"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={bySeverity} dataKey="count" nameKey="name" label>{bySeverity.map((_,i)=>(<Cell key={i} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></Card>
    </div>
  );
}
function Stat({label, value, sub}){return (<div className="p-4 rounded-2xl border bg-white shadow-sm"><div className="text-sm text-neutral-500">{label}</div><div className="text-2xl font-semibold">{value}</div>{sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}</div>);} 

// ---------- Concrete Log ----------
function ConcreteLog({isAdmin, inRange}){
  const { rows, insert, remove, clearAll } = useTable("concrete");
  const [draft,setDraft]=useState({ date:"", pour_id:"", location:"", element:"", volume:"", mix:"", supplier:"", start_time:"", end_time:"", cubes:"", supervisor:"", notes:"" });
  const shown = rows.filter(r=>inRange(r.date));
  const add = async ()=>{ if (!draft.date || !draft.location || !draft.element) return alert("Date, Location, Element required"); const user_id = DEMO? 'demo-user' : (await supabase.auth.getUser()).data.user.id; await insert({ ...draft, user_id }); setDraft({ date:"", pour_id:"", location:"", element:"", volume:"", mix:"", supplier:"", start_time:"", end_time:"", cubes:"", supervisor:"", notes:"" }); };
  const exportCSV = ()=>{ if (!isAdmin) return; const headers=["id","user_id","date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes","created_at"]; download(`concrete_${todayStr()}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1"><Card title="Add Concrete Casting"><FormGrid>
        <Input label="Date" type="date" value={draft.date} onChange={v=>setDraft({...draft,date:v})} />
        <Input label="Pour ID / Ref" value={draft.pour_id} onChange={v=>setDraft({...draft,pour_id:v})} />
        <Input label="Location / Zone" value={draft.location} onChange={v=>setDraft({...draft,location:v})} />
        <Input label="Element" value={draft.element} onChange={v=>setDraft({...draft,element:v})} />
        <Input label="Volume (m³)" value={draft.volume} onChange={v=>setDraft({...draft,volume:v})} />
        <Input label="Mix / Grade" value={draft.mix} onChange={v=>setDraft({...draft,mix:v})} />
        <Input label="Supplier" value={draft.supplier} onChange={v=>setDraft({...draft,supplier:v})} />
        <Input label="Start Time" type="time" value={draft.start_time} onChange={v=>setDraft({...draft,start_time:v})} />
        <Input label="End Time" type="time" value={draft.end_time} onChange={v=>setDraft({...draft,end_time:v})} />
        <Input label="Cube Samples (qty)" value={draft.cubes} onChange={v=>setDraft({...draft,cubes:v})} />
        <Input label="Supervisor" value={draft.supervisor} onChange={v=>setDraft({...draft,supervisor:v})} />
        <TextArea label="Notes" value={draft.notes} onChange={v=>setDraft({...draft,notes:v})} />
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={()=>confirm('Delete ALL?')&&clearAll()} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${shown.length})`}><DataTable columns={["date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes"]} rows={shown} onDelete={remove} /></Card></div>
    </section>
  );
}

// ---------- Manpower Log ----------
function ManpowerLog({isAdmin, inRange}){
  const { rows, insert, remove, clearAll } = useTable("manpower");
  const [draft,setDraft]=useState({ date:"", contractor:"", trade:"", workers:"", hours:"", zone:"", supervisor:"", notes:"" });
  const shown = rows.filter(r=>inRange(r.date));
  const add = async ()=>{ if (!draft.date || !draft.contractor || !draft.trade) return alert("Date, Contractor, Trade required"); const user_id = DEMO? 'demo-user' : (await supabase.auth.getUser()).data.user.id; await insert({ ...draft, user_id }); setDraft({ date:"", contractor:"", trade:"", workers:"", hours:"", zone:"", supervisor:"", notes:"" }); };
  const exportCSV = ()=>{ if (!isAdmin) return; const headers=["id","user_id","date","contractor","trade","workers","hours","zone","supervisor","notes","created_at"]; download(`manpower_${todayStr()}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1"><Card title="Add Manpower Entry"><FormGrid>
        <Input label="Date" type="date" value={draft.date} onChange={v=>setDraft({...draft,date:v})} />
        <Input label="Contractor" value={draft.contractor} onChange={v=>setDraft({...draft,contractor:v})} />
        <Input label="Trade" value={draft.trade} onChange={v=>setDraft({...draft,trade:v})} />
        <Input label="Workers (count)" value={draft.workers} onChange={v=>setDraft({...draft,workers:v})} />
        <Input label="Hours (per worker)" value={draft.hours} onChange={v=>setDraft({...draft,hours:v})} />
        <Input label="Zone / Area" value={draft.zone} onChange={v=>setDraft({...draft,zone:v})} />
        <Input label="Supervisor" value={draft.supervisor} onChange={v=>setDraft({...draft,supervisor:v})} />
        <TextArea label="Notes" value={draft.notes} onChange={v=>setDraft({...draft,notes:v})} />
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={()=>confirm('Delete ALL?')&&clearAll()} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${shown.length})`}><DataTable columns={["date","contractor","trade","workers","hours","zone","supervisor","notes"]} rows={shown} onDelete={remove} /></Card></div>
    </section>
  );
}

// ---------- Issues Log (photo upload) ----------
function IssuesLog({isAdmin, inRange}){
  const { rows, insert, remove, clearAll } = useTable("issues");
  const [draft,setDraft]=useState({ date:"", location:"", description:"", severity:"", status:"Open", raised_by:"", owner:"", due_by:"" });
  const [file,setFile]=useState(null);
  const shown = rows.filter(r=>inRange(r.date));
  const add = async ()=>{ if (!draft.date || !draft.location || !draft.description) return alert("Date, Location, Description required"); const user_id = DEMO? 'demo-user' : (await supabase.auth.getUser()).data.user.id; let photo_url=null; try{ if (file){ const path = await uploadToBucket('issue-photos', file); photo_url = await getPublicUrl('issue-photos', path);} }catch(e){ alert(e.message);} await insert({ ...draft, user_id, photo_url }); setDraft({ date:"", location:"", description:"", severity:"", status:"Open", raised_by:"", owner:"", due_by:"" }); setFile(null); };
  const exportCSV = ()=>{ if (!isAdmin) return; const headers=["id","user_id","date","location","description","severity","status","raised_by","owner","due_by","photo_url","created_at"]; download(`issues_${todayStr()}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1"><Card title="Add Issue"><FormGrid>
        <Input label="Date" type="date" value={draft.date} onChange={v=>setDraft({...draft,date:v})} />
        <Input label="Location / Zone" value={draft.location} onChange={v=>setDraft({...draft,location:v})} />
        <TextArea label="Description" value={draft.description} onChange={v=>setDraft({...draft,description:v})} />
        <Select label="Severity" value={draft.severity} onChange={v=>setDraft({...draft,severity:v})} options={["Low","Medium","High","Critical"]} />
        <Select label="Status" value={draft.status} onChange={v=>setDraft({...draft,status:v})} options={["Open","In Progress","Blocked","Closed"]} />
        <Input label="Raised By" value={draft.raised_by} onChange={v=>setDraft({...draft,raised_by:v})} />
        <Input label="Owner" value={draft.owner} onChange={v=>setDraft({...draft,owner:v})} />
        <Input label="Due By" type="date" value={draft.due_by} onChange={v=>setDraft({...draft,due_by:v})} />
        <label className="text-sm"><div className="text-xs text-neutral-500 mb-1">Photo</div><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center"><button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>{isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}{isAdmin && <button onClick={()=>confirm('Delete ALL?')&&clearAll()} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}</div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${shown.length})`}><DataTable columns={["date","location","description","severity","status","raised_by","owner","due_by","photo_url"]} rows={shown} onDelete={remove} /></Card></div>
    </section>
  );
}

// ---------- Materials Log (photo upload) ----------
function MaterialsLog({isAdmin, inRange}){
  const { rows, insert, remove, clearAll } = useTable("materials");
  const [draft,setDraft]=useState({ date:"", type:"Request", item:"", spec:"", qty:"", unit:"", needed_by:"", supplier:"", po:"", status:"Pending", location:"", requester:"" });
  const [file,setFile]=useState(null);
  const shown = rows.filter(r=>inRange(r.date));
  const add = async ()=>{ if (!draft.date || !draft.item) return alert("Date and Item required"); const user_id = DEMO? 'demo-user' : (await supabase.auth.getUser()).data.user.id; let photo_url=null; try{ if (file){ const path = await uploadToBucket('delivery-photos', file); photo_url = await getPublicUrl('delivery-photos', path);} }catch(e){ alert(e.message);} await insert({ ...draft, user_id, photo_url }); setDraft({ date:"", type:"Request", item:"", spec:"", qty:"", unit:"", needed_by:"", supplier:"", po:"", status:"Pending", location:"", requester:"" }); setFile(null); };
  const exportCSV = ()=>{ if (!isAdmin) return; const headers=["id","user_id","date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url","created_at"]; download(`materials_${todayStr()}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1"><Card title="Add Material Record"><FormGrid>
        <Input label="Date" type="date" value={draft.date} onChange={v=>setDraft({...draft,date:v})} />
        <Select label="Type" value={draft.type} onChange={v=>setDraft({...draft,type:v})} options={["Request","Delivery"]} />
        <Input label="Item" value={draft.item} onChange={v=>setDraft({...draft,item:v})} />
        <Input label="Specification" value={draft.spec} onChange={v=>setDraft({...draft,spec:v})} />
        <div className="grid grid-cols-2 gap-2"><Input label="Qty" value={draft.qty} onChange={v=>setDraft({...draft,qty:v})} /><Input label="Unit" value={draft.unit} onChange={v=>setDraft({...draft,unit:v})} /></div>
        <Input label="Needed By" type="date" value={draft.needed_by} onChange={v=>setDraft({...draft,needed_by:v})} />
        <Input label="Supplier" value={draft.supplier} onChange={v=>setDraft({...draft,supplier:v})} />
        <Input label="PO / Ref" value={draft.po} onChange={v=>setDraft({...draft,po:v})} />
        <Select label="Status" value={draft.status} onChange={v=>setDraft({...draft,status:v})} options={["Pending","Approved","Ordered","Delivered","Cancelled"]} />
        <Input label="Location / Zone" value={draft.location} onChange={v=>setDraft({...draft,location:v})} />
        <Input label="Requester" value={draft.requester} onChange={v=>setDraft({...draft,requester:v})} />
        <label className="text-sm"><div className="text-xs text-neutral-500 mb-1">Delivery / MR Photo</div><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center"><button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>{isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}{isAdmin && <button onClick={()=>confirm('Delete ALL?')&&clearAll()} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}</div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${shown.length})`}><DataTable columns={["date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url"]} rows={shown} onDelete={remove} /></Card></div>
    </section>
  );
}

// ---------- Printable Report ----------
function PrintableReport({inRange}){
  const { rows: concrete } = useTable("concrete");
  const { rows: manpower } = useTable("manpower");
  const { rows: issues } = useTable("issues");
  const { rows: materials } = useTable("materials");
  const c = concrete.filter(r=>inRange(r.date));
  const m = manpower.filter(r=>inRange(r.date));
  const i = issues.filter(r=>inRange(r.date));
  const mat = materials.filter(r=>inRange(r.date));
  return (
    <div className="bg-white p-6 rounded-2xl border">
      <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Daily Report – {todayStr()}</h3><button onClick={()=>window.print()} className="px-3 py-2 rounded-lg border">Print (A3)</button></div>
      <style>{`@media print {@page { size: A3 portrait; margin: 10mm; }}`}</style>
      <Section title={`Concrete (${c.length})`}>{c.map(r=>Row(r,["date","location","element","volume","mix","start_time","end_time","supervisor"]))}</Section>
      <Section title={`Manpower (${m.length})`}>{m.map(r=>Row(r,["date","contractor","trade","workers","hours","zone","supervisor"]))}</Section>
      <Section title={`Issues (${i.length})`}>{i.map(r=>Row(r,["date","location","severity","status","owner","due_by","photo_url"]))}</Section>
      <Section title={`Materials (${mat.length})`}>{mat.map(r=>Row(r,["date","type","item","qty","unit","status","needed_by","supplier","photo_url"]))}</Section>
    </div>
  );
}
function Section({title, children}){return (<div className="mb-6"><h4 className="font-semibold mb-2">{title}</h4><div className="grid gap-2">{children}</div></div>);} 
function Row(obj, keys){return (<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border rounded-xl p-2">{keys.map(k=> <div key={k}><span className="text-neutral-500 capitalize">{k.replaceAll('_',' ')}: </span><span className="font-medium">{String(obj[k]??'')}</span></div>)} </div>);} 

// ---------- Minimal runtime tests ----------
(function runTests(){
  try {
    const rows = [
      { a: 'x', b: 'y' },
      { a: '1,2', b: 'line1
line2' },
      { a: 'quote " inside', b: '' }
    ];
    const csv = toCSV(rows, ['a','b']);
    console.assert(csv.split('
').length === 4, 'CSV should have header + 3 lines');
    console.assert(csv.includes('"1,2"'), 'CSV should quote values with commas');
    console.assert(csv.includes('"line1
line2"'), 'CSV should preserve newlines (Unix)');
    console.assert(csv.includes('"quote "" inside"'), 'CSV should double internal quotes');
  } catch(err){ console.warn('Runtime tests failed:', err); }
})();
