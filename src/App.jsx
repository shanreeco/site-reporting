import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// --------- SUPABASE ---------
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const supabaseAnon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR-ANON-KEY";
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
const MISCONFIGURED = supabaseUrl.includes("YOUR-PROJECT") || supabaseAnon === "YOUR-ANON-KEY";

// --------- Session / Profile ---------
function useSessionProfile(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(undefined); // undefined while loading
  const [err,setErr]=useState("");

  // track auth session
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=> setSession(data.session??null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> listener?.subscription?.unsubscribe?.();
  },[]);

  // load or create profile
  useEffect(()=>{
    (async()=>{
      setErr("");
      if (!session?.user) { setProfile(null); return; }
      try {
        let { data, error } = await supabase
          .from('profiles').select('id,email,role')
          .eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        if (!data) {
          const { error: insErr } = await supabase
            .from('profiles')
            .insert({ id: session.user.id, email: session.user.email });
          if (insErr) throw insErr;
          ({ data, error } = await supabase
            .from('profiles').select('id,email,role')
            .eq('id', session.user.id).maybeSingle());
          if (error) throw error;
        }
             if (!data) { setErr('Profile not found'); setProfile(null); return; }
        setProfile(data);
      } catch(e){ setErr(e.message || String(e)); setProfile(null); }
    })();
  },[session?.user?.id]);

  return { session, profile, isAdmin: profile?.role==='admin', err };
}

// --------- Auth Page ---------
function AuthPage(){
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [signup,setSignup] = useState(false);
  const [msg,setMsg] = useState("");

  const handleAuth = async()=>{
    setMsg("");
    if (!email || !password) { setMsg('Email and password are required.'); return; }
    try {
      if (signup) {
        const { error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin } });
        setMsg(error ? error.message : 'Check your email to confirm sign-up.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMsg(error ? error.message : '');
      }
    } catch(e){ setMsg(e.message || String(e)); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-2">{signup ? 'Create account' : 'Sign in'}</h1>
        {MISCONFIGURED && (
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
            Supabase keys are not set. In Vercel add <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code>.
          </div>
        )}
        <input type="email" placeholder="name@company.com" value={email}
               onChange={e=>setEmail(e.target.value)}
               className="w-full border rounded-lg px-3 py-2 mb-2" />
        <div className="relative mb-3">
          <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password}
                 onChange={e=>setPassword(e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 pr-10" />
          <button type="button" aria-label="Show password"
                  onMouseDown={()=>setShowPass(true)}
                  onMouseUp={()=>setShowPass(false)}
                  onMouseLeave={()=>setShowPass(false)}
                  onTouchStart={()=>setShowPass(true)}
                  onTouchEnd={()=>setShowPass(false)}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-500">
            {showPass ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 01 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            )}
          </button>
        </div>
        <button onClick={handleAuth}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 text-white">
          {signup ? 'Sign up' : 'Sign in'}
        </button>
        <p className="text-xs text-neutral-500 mt-3">
          {signup ? 'Have an account? ' : 'No account? '}
          <button className="underline" onClick={()=>{ setSignup(!signup); setMsg(''); }}> {signup ? 'Sign in' : 'Create one'} </button>
        </p>
        {msg && <p className="text-xs text-red-600 mt-2">{msg}</p>}
      </div>
    </div>
  );
}

// --------- Root App + Dashboard Shell ---------
export default function App(){
  const { session, profile, err } = useSessionProfile();

  if (!session) return <AuthPage/>;
  if (profile === undefined) return <div className="min-h-screen grid place-items-center">Loading profile…</div>;
  if (err) return <div className="min-h-screen grid place-items-center text-red-700">{err}</div>;
  if (profile === null) return (
    <div className="min-h-screen grid place-items-center text-red-700">
      <div className="text-center">
        <p>Profile not found.</p>
        <button onClick={()=>supabase.auth.signOut()} className="underline mt-2">Sign out</button>
      </div>
    </div>
  );
  return <Dashboard profile={profile}/>;
}

// ========= Utilities =========
// newline character used in CSV
const NL = '\n';
function toCSV(rows, headerOrder){
  if (!rows || rows.length===0) return "";
  const headers = headerOrder ?? Object.keys(rows[0]);
  const esc = (v)=>{ const s = v==null?"":String(v); return (s.includes(',')||s.includes(NL)||s.includes('"'))? '"'+s.replaceAll('"','""')+'"' : s; };
  const out=[headers.join(',')];
  for(const r of rows) out.push(headers.map(h=>esc(r[h])).join(','));
  return out.join(NL);
}
function download(filename, text){
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Generic loader for tables (RLS will scope to user; admin sees all via policy)
function useTable(table){
  const [rows,setRows]=React.useState([]); const [loading,setLoading]=React.useState(true); const [error,setError]=React.useState("");
  async function fetchAll(){
    setLoading(true);
    const { data, error } = await supabase.from(table).select('*').order('created_at',{ascending:false});
    setRows(data||[]); setError(error?.message||""); setLoading(false);
  }
  React.useEffect(()=>{ fetchAll(); const ch = supabase.channel(`${table}-changes`).on('postgres_changes',{event:'*',schema:'public',table}, fetchAll).subscribe(); return ()=> supabase.removeChannel(ch); },[]);
  async function insert(row){ const user = (await supabase.auth.getUser()).data.user; const { error } = await supabase.from(table).insert({ ...row, user_id: user.id }); if (error) alert(error.message); }
  async function remove(id){ const { error } = await supabase.from(table).delete().eq('id', id); if (error) alert(error.message); }
  async function clearAll(){ if (!confirm('Delete ALL records?')) return; const { error } = await supabase.from(table).delete().neq('id','00000000-0000-0000-0000-000000000000'); if (error) alert(error.message); }
  return { rows, loading, error, insert, remove, clearAll };
}

async function uploadToBucket(bucket, file){
  const ext = file.name.split('.').pop(); const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert:false });
  if (error) throw error; const { data:pub } = await supabase.storage.from(bucket).getPublicUrl(data.path); return pub.publicUrl;
}

// ========= Reusable UI =========
function Card({title, children}){return (<div className="bg-white border rounded-2xl p-4 shadow-sm">{title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}{children}</div>);} 
function FormGrid({children}){return <div className="grid grid-cols-1 gap-2">{children}</div>;}
function Input({label, value, onChange, type="text"}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><input type={type} value={value||""} onChange={e=>onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></label>);} 
function TextArea({label, value, onChange}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><textarea value={value||""} onChange={e=>onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 h-24" /></label>);} 
function Select({label, value, onChange, options}){return (<label className="text-sm"><div className="text-xs text-neutral-500 mb-1">{label}</div><select value={value||""} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg"><option value="">-- Select --</option>{options.map(opt=> <option key={opt} value={opt}>{opt}</option>)}</select></label>);} 
function DataTable({columns, rows, onDelete}){
  return (
    <div className="overflow-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map(c=> <th key={c} className="text-left px-3 py-2 border-b whitespace-nowrap capitalize">{c.replaceAll('_',' ')}</th>)}
            <th className="px-3 py-2 border-b text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=> (
            <tr key={r.id} className="odd:bg-white even:bg-neutral-50">
              {columns.map(c=> (<td key={c} className="px-3 py-2 border-b align-top whitespace-pre-wrap">{String(r[c]??'')}</td>))}
              <td className="px-3 py-2 border-b text-right"><button onClick={()=>onDelete(r.id)} className="text-red-600 hover:underline">Delete</button></td>
            </tr>
          ))}
          {rows.length===0 && <tr><td className="px-3 py-6 text-center text-neutral-500" colSpan={columns.length+1}>No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ========= Dashboard =========
function Dashboard({profile}){
  const isAdmin = profile?.role === 'admin';
  const [tab,setTab] = React.useState('dashboard');
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="px-6 pt-6 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold">Construction Site Reporting</h1>
          <span className="text-xs text-neutral-600 px-2 py-1 rounded-full border">{profile.email} · {profile.role}</span>
          <div className="ml-auto"><button onClick={()=>supabase.auth.signOut()} className="px-3 py-2 border rounded">Sign out</button></div>
        </div>
        <div className="max-w-7xl mx-auto">
          <nav className="mt-4 flex gap-2 flex-wrap">
            {[['dashboard','Dashboard'],['concrete','Concrete'],['manpower','Manpower'],['issues','Issues'],['materials','Materials']].map(([k,l])=> (
              <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1.5 rounded-full border ${tab===k?"bg-neutral-900 text-white":"bg-white hover:bg-neutral-100"}`}>{l}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="p-6 grid gap-4 max-w-7xl mx-auto">
        {tab==='dashboard' && <Card title="Welcome"><p className="text-sm text-neutral-600">Use the tabs to add data. CSV export shows only for admins.</p></Card>}
        {tab==='concrete' && <ConcreteLog isAdmin={isAdmin} />}
        {tab==='manpower' && <ManpowerLog isAdmin={isAdmin} />}
        {tab==='issues' && <IssuesLog isAdmin={isAdmin} />}
        {tab==='materials' && <MaterialsLog isAdmin={isAdmin} />}
      </main>
    </div>
  );
}

// ========= Sections =========
function ConcreteLog({isAdmin}){
  const { rows, insert, remove, clearAll } = useTable('concrete');
  const [d,setD]=React.useState({ date:'', pour_id:'', location:'', element:'', volume:'', mix:'', supplier:'', start_time:'', end_time:'', cubes:'', supervisor:'', notes:'' });
  const add = async()=>{ if(!d.date||!d.location||!d.element) return alert('Date, Location, Element required'); await insert(d); setD({ date:'', pour_id:'', location:'', element:'', volume:'', mix:'', supplier:'', start_time:'', end_time:'', cubes:'', supervisor:'', notes:'' }); };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes","created_at"]; download(`concrete_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div><Card title="Add Concrete"><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Input label="Pour ID / Ref" value={d.pour_id} onChange={v=>setD({...d,pour_id:v})} />
        <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
        <Input label="Element" value={d.element} onChange={v=>setD({...d,element:v})} />
        <Input label="Volume (m³)" value={d.volume} onChange={v=>setD({...d,volume:v})} />
        <Input label="Mix / Grade" value={d.mix} onChange={v=>setD({...d,mix:v})} />
        <Input label="Supplier" value={d.supplier} onChange={v=>setD({...d,supplier:v})} />
        <Input label="Start Time" type="time" value={d.start_time} onChange={v=>setD({...d,start_time:v})} />
        <Input label="End Time" type="time" value={d.end_time} onChange={v=>setD({...d,end_time:v})} />
        <Input label="Cube Samples (qty)" value={d.cubes} onChange={v=>setD({...d,cubes:v})} />
        <Input label="Supervisor" value={d.supervisor} onChange={v=>setD({...d,supervisor:v})} />
        <TextArea label="Notes" value={d.notes} onChange={v=>setD({...d,notes:v})} />
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${rows.length})`}><DataTable columns={["date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes"]} rows={rows} onDelete={remove} /></Card></div>
    </section>
  );
}

function ManpowerLog({isAdmin}){
  const { rows, insert, remove, clearAll } = useTable('manpower');
  const [d,setD]=React.useState({ date:'', contractor:'', trade:'', workers:'', hours:'', zone:'', supervisor:'', notes:'' });
  const add = async()=>{ if(!d.date||!d.contractor||!d.trade) return alert('Date, Contractor, Trade required'); await insert(d); setD({ date:'', contractor:'', trade:'', workers:'', hours:'', zone:'', supervisor:'', notes:'' }); };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","contractor","trade","workers","hours","zone","supervisor","notes","created_at"]; download(`manpower_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div><Card title="Add Manpower"><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Input label="Contractor" value={d.contractor} onChange={v=>setD({...d,contractor:v})} />
        <Input label="Trade" value={d.trade} onChange={v=>setD({...d,trade:v})} />
        <Input label="Workers (count)" value={d.workers} onChange={v=>setD({...d,workers:v})} />
        <Input label="Hours (per worker)" value={d.hours} onChange={v=>setD({...d,hours:v})} />
        <Input label="Zone / Area" value={d.zone} onChange={v=>setD({...d,zone:v})} />
        <Input label="Supervisor" value={d.supervisor} onChange={v=>setD({...d,supervisor:v})} />
        <TextArea label="Notes" value={d.notes} onChange={v=>setD({...d,notes:v})} />
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${rows.length})`}><DataTable columns={["date","contractor","trade","workers","hours","zone","supervisor","notes"]} rows={rows} onDelete={remove} /></Card></div>
    </section>
  );
}

function IssuesLog({isAdmin}){
  const { rows, insert, remove, clearAll } = useTable('issues');
  const [d,setD]=React.useState({ date:'', location:'', description:'', severity:'', status:'Open', raised_by:'', owner:'', due_by:'', photo_url:'' });
  const [file,setFile]=React.useState(null);
  const add = async()=>{
    if(!d.date||!d.location||!d.description) return alert('Date, Location, Description required');
    let url=d.photo_url; if(file){ try{ url = await uploadToBucket('issue-photos', file);}catch(e){ alert(e.message);} }
    await insert({ ...d, photo_url:url }); setD({ date:'', location:'', description:'', severity:'', status:'Open', raised_by:'', owner:'', due_by:'', photo_url:'' }); setFile(null);
  };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","location","description","severity","status","raised_by","owner","due_by","photo_url","created_at"]; download(`issues_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div><Card title="Add Issue"><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
        <TextArea label="Description" value={d.description} onChange={v=>setD({...d,description:v})} />
        <Select label="Severity" value={d.severity} onChange={v=>setD({...d,severity:v})} options={["Low","Medium","High","Critical"]} />
        <Select label="Status" value={d.status} onChange={v=>setD({...d,status:v})} options={["Open","In Progress","Blocked","Closed"]} />
        <Input label="Raised By" value={d.raised_by} onChange={v=>setD({...d,raised_by:v})} />
        <Input label="Owner" value={d.owner} onChange={v=>setD({...d,owner:v})} />
        <Input label="Due By" type="date" value={d.due_by} onChange={v=>setD({...d,due_by:v})} />
        <label className="text-sm"><div className="text-xs text-neutral-500 mb-1">Photo</div><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${rows.length})`}><DataTable columns={["date","location","description","severity","status","raised_by","owner","due_by","photo_url"]} rows={rows} onDelete={remove} /></Card></div>
    </section>
  );
}

function MaterialsLog({isAdmin}){
  const { rows, insert, remove, clearAll } = useTable('materials');
  const [d,setD]=React.useState({ date:'', type:'Request', item:'', spec:'', qty:'', unit:'', needed_by:'', supplier:'', po:'', status:'Pending', location:'', requester:'', photo_url:'' });
  const [file,setFile]=React.useState(null);
  const add = async()=>{
    if(!d.date||!d.item) return alert('Date and Item required');
    let url=d.photo_url; if(file){ try{ url = await uploadToBucket('delivery-photos', file);}catch(e){ alert(e.message);} }
    await insert({ ...d, photo_url:url }); setD({ date:'', type:'Request', item:'', spec:'', qty:'', unit:'', needed_by:'', supplier:'', po:'', status:'Pending', location:'', requester:'', photo_url:'' }); setFile(null);
  };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url","created_at"]; download(`materials_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <div><Card title="Add Material Record"><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Select label="Type" value={d.type} onChange={v=>setD({...d,type:v})} options={["Request","Delivery"]} />
        <Input label="Item" value={d.item} onChange={v=>setD({...d,item:v})} />
        <Input label="Specification" value={d.spec} onChange={v=>setD({...d,spec:v})} />
        <div className="grid grid-cols-2 gap-2"><Input label="Qty" value={d.qty} onChange={v=>setD({...d,qty:v})} /><Input label="Unit" value={d.unit} onChange={v=>setD({...d,unit:v})} /></div>
        <Input label="Needed By" type="date" value={d.needed_by} onChange={v=>setD({...d,needed_by:v})} />
        <Input label="Supplier" value={d.supplier} onChange={v=>setD({...d,supplier:v})} />
        <Input label="PO / Ref" value={d.po} onChange={v=>setD({...d,po:v})} />
        <Select label="Status" value={d.status} onChange={v=>setD({...d,status:v})} options={["Pending","Approved","Ordered","Delivered","Cancelled"]} />
        <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
        <Input label="Requester" value={d.requester} onChange={v=>setD({...d,requester:v})} />
        <label className="text-sm"><div className="text-xs text-neutral-500 mb-1">Delivery / MR Photo</div><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
      </FormGrid>
      <div className="mt-3 flex gap-2 items-center">
        <button onClick={add} className="px-3 py-2 rounded-lg bg-neutral-900 text-white">Add</button>
        {isAdmin && <button onClick={exportCSV} className="px-3 py-2 rounded-lg border">Export CSV</button>}
        {isAdmin && <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-red-300 text-red-700">Clear All</button>}
      </div></Card></div>
      <div className="md:col-span-2"><Card title={`Records (${rows.length})`}><DataTable columns={["date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url"]} rows={rows} onDelete={remove} /></Card></div>
    </section>
  );
}
