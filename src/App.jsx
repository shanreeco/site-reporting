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
  const [profile,setProfile]=useState(undefined); // undefined = loading, null = not found yet
  const [err,setErr]=useState("");
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=> setSession(data.session??null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> sub?.subscription?.unsubscribe();
  },[]);
  useEffect(()=>{
    (async()=>{
      setErr("");
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase
        .from('profiles').select('id,email,role')
        .eq('id', session.user.id).maybeSingle();
      if (error) { setErr(error.message); setProfile(null); return; }
      if (data) { setProfile(data); return; }
      // If profile row is missing, create with default server-side role 'supervisor'
      const { error: insErr } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, email: session.user.email });
      if (insErr) { setErr(insErr.message); setProfile(null); return; }
      const { data: d2, error: e2 } = await supabase
        .from('profiles').select('id,email,role')
        .eq('id', session.user.id).maybeSingle();
      if (e2) { setErr(e2.message); setProfile(null); return; }
      setProfile(d2 || { id: session.user.id, email: session.user.email, role: 'supervisor' });
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
    if (signup) {
      const { error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : 'Check your email to confirm sign-up.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMsg(error ? error.message : '');
    }
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
        <input type="password" placeholder="Password" value={password}
               onChange={e=>setPassword(e.target.value)}
               className="w-full border rounded-lg px-3 py-2 mb-3" />
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

// --------- Root App + Debug ---------
function ErrorBox({title="Error", message=""}){
  if (!message) return null;
  return (
    <div className="min-h-screen grid place-items-center bg-red-50">
      <div className="max-w-xl w-full border border-red-300 bg-white rounded-2xl p-4 text-red-700">
        <h2 className="font-semibold mb-2">{title}</h2>
        <pre className="whitespace-pre-wrap text-xs">{String(message)}</pre>
        <button className="mt-3 px-3 py-2 border rounded" onClick={()=>location.reload()}>Reload</button>
      </div>
    </div>
  );
}

export default function App(){
  const { session, profile, err } = useSessionProfile();
  // Global runtime error capture to avoid blank screen
  const [fatal, setFatal] = useState("");
  useEffect(()=>{
    const onErr = (e)=> setFatal(e?.error?.stack || e?.message || String(e));
    const onRej = (e)=> setFatal(e?.reason?.stack || e?.reason?.message || String(e.reason ?? e));
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return ()=>{ window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej); };
  },[]);
  if (fatal) return <ErrorBox title="Runtime error" message={fatal} />;

  if (!session) return <AuthPage/>;
  if (profile === undefined) return <div className="min-h-screen grid place-items-center">Loading profile…</div>;
  if (err) return <ErrorBox title="Supabase error" message={err} />;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <h1 className="text-xl font-semibold mb-4">Welcome {profile.email} ({profile.role})</h1>
      <button onClick={()=>supabase.auth.signOut()} className="px-3 py-2 border rounded">Sign out</button>
    </div>
  );
}
