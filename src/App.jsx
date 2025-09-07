import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// --------- SUPABASE ---------
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
const supabaseAnon = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR-ANON-KEY";
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// --------- Session / Profile ---------
function useSessionProfile(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(undefined); // undefined = loading, null = no profile
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=> setSession(data.session??null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> sub?.subscription?.unsubscribe();
  },[]);
  useEffect(()=>{
    (async()=>{
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase.from('profiles').select('id,email,role').eq('id', session.user.id).maybeSingle();
      if (error) { console.error(error); setProfile(null); }
      else setProfile(data??{ id: session.user.id, email: session.user.email, role: "supervisor" });
    })();
  },[session?.user?.id]);
  return { session, profile, isAdmin: profile?.role==='admin' };
}

// --------- Root App ---------
export default function App(){
  const { session, profile } = useSessionProfile();
  if (!session) return <div>Please log in</div>;
  if (profile === undefined) return <div>Loading profile…</div>;
  return <div>Welcome {profile.email} ({profile.role})</div>;
}
