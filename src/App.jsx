import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// --------- SUPABASE ---------
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const supabaseAnon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR-ANON-KEY";
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// --------- APP (Auth + Protected) ---------
export default function AuthApp(){
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);
  if (!session) return <AuthPage />;
  return <Dashboard />;
}

// --------- LOGIN / SIGN-UP ---------
function AuthPage(){
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [signup,setSignup] = useState(false);
  const [msg,setMsg] = useState("");

  const handleAuth = async()=>{
    if (!email || !password) { setMsg("Email and password are required."); return; }
    if (signup) {
      const { error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin }});
      setMsg(error ? error.message : "Check your email to confirm sign-up.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMsg(error ? error.message : "");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <div className="bg-white border rounded-2xl p-6 shadow w-80">
        <h2 className="text-lg font-semibold mb-2">{signup ? "Create account" : "Sign in"}</h2>
        <input type="email" placeholder="Email" value={email}
               onChange={e=>setEmail(e.target.value)}
               className="w-full border rounded px-3 py-2 mb-2" />
        <input type="password" placeholder="Password" value={password}
               onChange={e=>setPassword(e.target.value)}
               className="w-full border rounded px-3 py-2 mb-3" />
        <button onClick={handleAuth}
                className="w-full px-3 py-2 rounded bg-neutral-900 text-white">
          {signup ? "Sign up" : "Sign in"}
        </button>
        <p className="text-xs text-neutral-500 mt-2">
          {signup ? "Have an account? " : "No account? "}
          <button className="underline" onClick={()=>{setSignup(!signup); setMsg("");}}>
            {signup ? "Sign in" : "Create one"}
          </button>
        </p>
        {msg && <p className="text-xs text-red-600 mt-2">{msg}</p>}
      </div>
    </div>
  );
}

// --------- PROTECTED DASHBOARD ---------
function Dashboard(){
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <h1 className="text-xl font-semibold mb-4">Construction Site Reporting</h1>
      <button onClick={()=>supabase.auth.signOut()} className="px-3 py-2 border rounded">Sign out</button>
    </div>
  );
}
