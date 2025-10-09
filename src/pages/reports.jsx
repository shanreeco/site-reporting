import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import DataTable from "../components/DataTable";
import { useTable } from "../hooks/useTable";
import { useDailyTasks, TASK_STATUSES } from "../hooks/useDailyTasks";
import { supabase, MISCONFIGURED } from "../services/supabase";
import {
  SHIFT_OPTIONS,
  LEVEL_OPTIONS,
  ZONE_LETTERS,
  ZONE_NUMBERS,
  formatManpowerZone,
  parseManpowerZone,
  buildManpowerNotes,
  splitManpowerNotes,
} from "../utils/manpower";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
const today = () => new Date().toISOString().slice(0, 10);
const formatRole = (role) =>
  role
    ? role
        .toString()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Role not assigned";
const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

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
  const loadProfile = async()=>{
      setErr("");
      if (!session?.user) { setProfile(null); return; }
      try {
        let { data, error } = await supabase
          .from('profiles').select('id,email,role,full_name,ic_last4')
          .eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        if (!data) {
          const { error: insErr } = await supabase
            .from('profiles')
            .insert({ id: session.user.id, email: session.user.email, full_name: null, ic_last4: null });
          if (insErr) throw insErr;
          ({ data, error } = await supabase
            .from('profiles').select('id,email,role,full_name,ic_last4')
            .eq('id', session.user.id).maybeSingle());
          if (error) throw error;
        }
        if (!data) { setErr('Profile not found'); setProfile(null); return; }
        setProfile(data);
      } catch(e){ setErr(e.message || String(e)); setProfile(null); }
  };

  useEffect(()=>{ loadProfile(); },[session?.user?.id]);

  return { session, profile, isAdmin: profile?.role==='admin', err, refreshProfile: loadProfile };
}

// --------- Auth Page ---------
function AuthPage(){
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [signup,setSignup] = useState(false);
  const [msg,setMsg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [processing, setProcessing] = useState(false);
  const emailId = React.useId();
  const passwordId = React.useId();
  const messageId = React.useId();

  const handleAuth = async()=>{
    setMsg("");
    if (!email || !password) { setMsg('Email and password are required.'); return; }
    try {
      setProcessing(true);
      if (signup) {
        const { error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin } });
        setMsg(error ? error.message : 'Check your email to confirm sign-up.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMsg(error ? error.message : '');
      }
    } catch(e){ setMsg(e.message || String(e)); }
    finally { setProcessing(false); }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await handleAuth();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-12 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 dark:text-neutral-100">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-neutral-200/60 blur-3xl dark:bg-neutral-800/60" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-[28rem] w-[28rem] rounded-full bg-neutral-300/50 blur-3xl dark:bg-neutral-700/50" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Site reporting workspace</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{signup ? 'Create an account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Use your company credentials to access real-time site insights.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-900/80" noValidate>
          {MISCONFIGURED && (
            <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-3 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="status" aria-live="polite">
              Supabase keys are not set. In Vercel add <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code>.
            </div>
          )}
          <div className="space-y-3">
            <label className="text-sm" htmlFor={emailId}>
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-500">Email</span>
              <input
                id={emailId}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                aria-describedby={msg ? messageId : undefined}
                aria-invalid={msg && !email ? "true" : undefined}
                className="w-full rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-2 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
              />
            </label>
            <label className="text-sm" htmlFor={passwordId}>
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-500">Password</span>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete={signup ? "new-password" : "current-password"}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  aria-describedby={msg ? messageId : undefined}
                  aria-invalid={msg && !password ? "true" : undefined}
                  className="w-full rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-2 pr-12 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
                />
                <button
                  type="button"
                  aria-pressed={showPass}
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex h-full items-center rounded-full px-2 text-neutral-500 transition hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-200 dark:focus-visible:outline-neutral-300"
                >
                  <span className="sr-only">{showPass ? 'Hide password' : 'Show password'}</span>
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.512 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.243L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          </div>
          {msg && (
            <p
              id={messageId}
              className="mt-3 rounded-xl bg-red-50/80 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300"
              role="alert"
            >
              {msg}
            </p>
          )}
          <button
            type="submit"
            disabled={processing}
            className="mt-4 w-full rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
          >
            {processing ? 'Submitting…' : signup ? 'Sign up' : 'Sign in'}
          </button>
          <p className="mt-4 text-center text-xs text-neutral-600 dark:text-neutral-400">
            {signup ? 'Have an account? ' : 'No account yet? '}
            <button
              type="button"
              className="font-semibold text-neutral-900 underline decoration-neutral-400 decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:text-neutral-100 dark:focus-visible:outline-neutral-200"
              onClick={()=>{ setSignup(!signup); setMsg(''); }}
            >
              {signup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function ProfileSetup({ session, profile, refreshProfile }){
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [icLast4, setIcLast4] = useState(profile.ic_last4 || "");
  const [icErr, setIcErr] = useState("");
  const [msg, setMsg] = useState("");

  const handleIcChange = (val) => {
    setIcLast4(val);
    if (val === "" || /^\d{3}[A-Za-z]$/.test(val)) {
      setIcErr("");
    } else {
      setIcErr("IC Last 4 must be three digits followed by a letter.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!fullName.trim()) {
      setMsg("Full Name is required.");
      return;
    }
    if (!/^\d{3}[A-Za-z]$/.test(icLast4)) {
      setMsg("IC Last 4 must be three digits followed by a letter.");
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), ic_last4: icLast4 })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-12 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 dark:text-neutral-100">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-72 w-[28rem] rounded-full bg-neutral-200/60 blur-3xl dark:bg-neutral-800/50" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-lg">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-xl backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-900/80">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Complete your profile</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tell us about you</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">We use this information to personalise your dashboard and reports.</p>
          </div>
          <div className="grid gap-3">
            <Input label="Full Name" value={fullName} onChange={setFullName} autoComplete="name" />
            <Input
              label="IC Last 4"
              value={icLast4}
              onChange={handleIcChange}
              inputMode="text"
              pattern="\d{3}[A-Za-z]"
              maxLength={4}
              helpText="Format: three digits followed by one letter."
              errorMessage={icErr}
            />
          </div>
          {msg && (
            <p className="mt-4 rounded-xl bg-red-50/80 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {msg}
            </p>
          )}
          <button
            type="submit"
            disabled={!!icErr || icLast4.length !== 4 || !fullName.trim()}
            className="mt-6 w-full rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
          >
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileEditor({ session, profile, refreshProfile, onClose }){
  const [fullName, setFullName] = React.useState(profile.full_name || "");
  const [icLast4, setIcLast4] = React.useState(profile.ic_last4 || "");
  const [icErr, setIcErr] = React.useState("");
  const [msg, setMsg] = React.useState("");

  const handleIcChange = (val) => {
    setIcLast4(val);
    if (val === "" || /^\d{3}[A-Za-z]$/.test(val)) {
      setIcErr("");
    } else {
      setIcErr("IC Last 4 must be three digits followed by a letter.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!fullName.trim()) {
      setMsg("Full Name is required.");
      return;
    }
    if (!/^\d{3}[A-Za-z]$/.test(icLast4)) {
      setMsg("IC Last 4 must be three digits followed by a letter.");
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), ic_last4: icLast4 })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      onClose();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  };

  const headingId = React.useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-900/85"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200/70 text-neutral-500 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/70 dark:text-neutral-300 dark:focus-visible:outline-neutral-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-6">
          <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
            Update your details
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Keep your name and IC number current so your reports stay aligned.</p>
        </div>
        <div className="grid gap-3">
          <Input label="Full Name" value={fullName} onChange={setFullName} />
          <Input
            label="IC Last 4"
            value={icLast4}
            onChange={handleIcChange}
            inputMode="text"
            pattern="\d{3}[A-Za-z]"
            maxLength={4}
            helpText="Format: three digits followed by one letter."
            errorMessage={icErr}
          />
        </div>
        {msg && (
          <p className="mt-4 rounded-xl bg-red-50/80 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={!!icErr || icLast4.length !== 4 || !fullName.trim()}
          className="mt-6 w-full rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}

// --------- Root App + Dashboard Shell ---------
export default function ReportsPage(){
  const { session, profile, err, refreshProfile } = useSessionProfile();

  if (!session) return <AuthPage/>;
  if (profile === undefined) return <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Loading profile…</div>;
  if (err) return <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-red-700 dark:text-red-300">{err}</div>;
  if (profile === null) return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="relative inline-flex h-12 w-12 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400/50" aria-hidden="true"></span>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-200 animate-spin" aria-hidden="true"></span>
        </span>
        <p className="text-sm font-medium">Setting up your profile…</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">This may take just a moment. You’ll be redirected automatically.</p>
      </div>
    </div>
  );
    if (!profile.full_name || !profile.ic_last4) return <ProfileSetup session={session} profile={profile} refreshProfile={refreshProfile} />;
  return <Dashboard session={session} profile={profile} refreshProfile={refreshProfile}/>;
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

const MANPOWER_BUCKET_PREFERENCES = Array.from(
  new Set(
    [
      import.meta.env?.VITE_SUPABASE_MANPOWER_BUCKET,
      "manpower-photos",
      "manpower_photos",
    ].filter(Boolean),
  ),
);

async function uploadToBucket(bucket, file){
  const ext = file.name.split('.').pop(); const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const candidates = bucket === 'manpower-photos' ? MANPOWER_BUCKET_PREFERENCES : [bucket];
  let lastError = null;

  for (const target of candidates){
    const { data, error } = await supabase.storage.from(target).upload(path, file, { upsert:false });
    if (!error){
      const { data:pub } = await supabase.storage.from(target).getPublicUrl(data.path);
      return pub.publicUrl;
    }

    lastError = error;
    const message = (error?.message || "").toLowerCase();
    if (!message.includes('bucket not found')){
      throw error;
    }
  }

  if (lastError) throw lastError;
  throw new Error(`Unable to upload file to bucket: ${bucket}`);
}

// ========= Reusable UI =========
function FormGrid({children}){return <div className="grid grid-cols-1 gap-3">{children}</div>;}
function Input({ label, value, onChange, type = "text", className = "", helpText, errorMessage, id, ...props }) {
  const { "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ...rest } = props;
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const extra = ["date", "time"].includes(type) ? "appearance-none h-11" : "";
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="text-sm">
      <label className="block" htmlFor={inputId}>
        <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">{label}</div>
        <input
          id={inputId}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={errorMessage ? "true" : ariaInvalid}
          className={`w-full rounded-xl border border-neutral-200/80 bg-white/85 px-3 py-2 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20 ${extra} ${className}`}
          {...rest}
        />
      </label>
      {helpText && (
        <p id={helpId} className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {helpText}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
function TextArea({ label, value, onChange, id, helpText, errorMessage, ...props }) {
  const { "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ...rest } = props;
  const generatedId = React.useId();
  const textAreaId = id ?? generatedId;
  const helpId = helpText ? `${textAreaId}-help` : undefined;
  const errorId = errorMessage ? `${textAreaId}-error` : undefined;
  const describedBy = [ariaDescribedBy, helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="text-sm">
      <label className="block" htmlFor={textAreaId}>
        <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">{label}</div>
        <textarea
          id={textAreaId}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={errorMessage ? "true" : ariaInvalid}
          className="h-28 w-full rounded-xl border border-neutral-200/80 bg-white/85 px-3 py-2 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
          {...rest}
        />
      </label>
      {helpText && (
        <p id={helpId} className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {helpText}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
function Select({label, value, onChange, options}){
  return (
    <label className="text-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">{label}</div>
      <select
        value={value||""}
        onChange={e=>onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-200/80 bg-white/85 px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20 dark:focus-visible:outline-neutral-300"
      >
        <option value="">-- Select --</option>
        {options.map(opt=> <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}

function RefreshButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Refresh"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-white/85 text-neutral-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-300 dark:focus-visible:outline-neutral-300"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 9.75V6.75l3.75 3.75L16.5 14.25v-3a6.75 6.75 0 10-6 6.68"
        />
      </svg>
    </button>
  );
}

// ========= Dashboard =========
function Dashboard({ session, profile, refreshProfile }){
  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const [tab, setTab] = React.useState('dashboard');
  const [showProfile, setShowProfile] = React.useState(false);
  const firstName = profile.full_name?.split(' ')[0] || 'User';
  const avatarInitial = firstName?.[0]?.toUpperCase() || 'U';
  const roleLabel = formatRole(profile?.role);
  React.useEffect(() => {
    document.title = `${firstName}'s Site Reporting`;
  }, [firstName]);
  const tabs = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'tasks', label: 'Daily tasks' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'manpower', label: 'Manpower' },
    { value: 'issues', label: 'Issues' },
    { value: 'materials', label: 'Materials' },
    { value: 'bbs', label: 'BBS schedule' },
  ];
  const handleSignOut = () => supabase.auth.signOut();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 dark:text-neutral-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-neutral-200/80 to-transparent blur-3xl dark:from-neutral-800/60" aria-hidden="true" />
      <Header
        title={`${firstName}'s Site Reporting`}
        subtitle="Live project intelligence"
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        onEditProfile={() => setShowProfile(true)}
        onSignOut={handleSignOut}
        avatarInitial={avatarInitial}
        roleLabel={roleLabel}
      />

      <main className="relative mx-auto grid max-w-7xl gap-6 px-6 pb-16 pt-10">
        {tab==='dashboard' && <DashboardTab />}
        {tab==='tasks' && (
          <DailyTasksLog
            isAdmin={isAdmin}
            isSupervisor={isSupervisor}
          />
        )}
        {tab==='concrete' && <ConcreteLog isAdmin={isAdmin} />}
        {tab==='manpower' && <ManpowerLog isAdmin={isAdmin} />}
        {tab==='issues' && <IssuesLog isAdmin={isAdmin} />}
        {tab==='materials' && <MaterialsLog isAdmin={isAdmin} />}
        {tab==='bbs' && <BbsScheduleLog isAdmin={isAdmin} />}
      </main>
      
      {showProfile && (
        <ProfileEditor
          session={session}
          profile={profile}
          refreshProfile={refreshProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

function DashboardTab(){
  const { rows: concreteRows, loading: concreteLoading, error: concreteError } = useTable('concrete');
  const { rows: manpowerRows, loading: manpowerLoading, error: manpowerError } = useTable('manpower');
  const { rows: materialRows, loading: materialLoading, error: materialError } = useTable('materials');
  const { rows: issueRows, loading: issuesLoading, error: issuesError } = useTable('issues');
  const { rows: bbsRows, loading: bbsLoading, error: bbsError } = useTable('bbs_schedule');

  const concreteData = React.useMemo(()=>{
    const byDate = {};
    for(const r of concreteRows){
      const d = r.date || '';
      const v = parseFloat(r.volume) || 0;
      byDate[d] = (byDate[d]||0) + v;
    }
    return Object.entries(byDate).map(([date, volume])=>({ date, volume }));
  },[concreteRows]);

  const manpowerData = React.useMemo(()=>{
    const byDate = {};
    for(const r of manpowerRows){
      const d = r.date || '';
      const w = parseFloat(r.workers) || 0;
      byDate[d] = (byDate[d]||0) + w;
    }
    return Object.entries(byDate).map(([date, workers])=>({ date, workers }));
  },[manpowerRows]);

  const materialData = React.useMemo(()=>{
    const byStatus = {};
    for(const r of materialRows){
      const s = r.status || 'Unknown';
      byStatus[s] = (byStatus[s]||0) + 1;
    }
    return Object.entries(byStatus).map(([name, value])=>({ name, value }));
  },[materialRows]);

  const bbsDeliveryData = React.useMemo(()=>{
    const byDate = {};
    for(const r of bbsRows){
      const d = r.delivery_date || '';
      const w = parseFloat(r.weight_tons) || 0;
      byDate[d] = (byDate[d]||0) + w;
    }
    return Object.entries(byDate).map(([date, weight])=>({ date, weight }));
  },[bbsRows]);

  const COLORS = ['#4c51bf', '#0f766e', '#f59e0b', '#db2777', '#7c3aed'];

  const summarizeSeries = React.useCallback((data, labelKey, valueKey, unitLabel) => {
    if (!data.length) return 'No data available.';
    const preview = data.slice(0, 5);
    const parts = preview.map((item) => {
      const label = item?.[labelKey] ?? 'Unknown';
      const value = item?.[valueKey] ?? 0;
      return `${label}: ${value}${unitLabel ? ` ${unitLabel}` : ''}`;
    });
    return `${parts.join('; ')}${data.length > preview.length ? '; additional data available' : ''}`;
  }, []);

  const summarizePie = React.useCallback((data) => {
    if (!data.length) return 'No data available.';
    return data.map((item) => `${item.name}: ${item.value}`).join('; ');
  }, []);

  const concreteSummary = summarizeSeries(concreteData, 'date', 'volume', 'm³');
  const manpowerSummary = summarizeSeries(manpowerData, 'date', 'workers', 'workers');
  const materialSummary = summarizePie(materialData);
  const bbsDeliverySummary = summarizeSeries(bbsDeliveryData, 'date', 'weight', 't');
  const heroLoading = concreteLoading || manpowerLoading || issuesLoading || materialLoading || bbsLoading;

  const totalConcreteVolume = React.useMemo(
    () => concreteRows.reduce((sum, row) => sum + (parseFloat(row.volume) || 0), 0),
    [concreteRows]
  );
  const totalWorkers = React.useMemo(
    () => manpowerRows.reduce((sum, row) => sum + (parseFloat(row.workers) || 0), 0),
    [manpowerRows]
  );
  const openIssues = React.useMemo(
    () => issueRows.filter(row => (row.status || '').toLowerCase() !== 'closed').length,
    [issueRows]
  );
  const activeMaterials = React.useMemo(
    () => materialRows.filter(row => {
      const status = (row.status || '').toLowerCase();
      return ['pending', 'approved', 'ordered'].includes(status);
    }).length,
    [materialRows]
  );
  const totalBbsWeight = React.useMemo(
    () => bbsRows.reduce((sum, row) => sum + (parseFloat(row.weight_tons) || 0), 0),
    [bbsRows]
  );
  const upcomingBbsDeliveries = React.useMemo(()=>{
    const today = new Date();
    today.setHours(0,0,0,0);
    return bbsRows.filter(row => {
      const value = row.delivery_date;
      if(!value) return false;
      const date = new Date(value);
      if(Number.isNaN(date.getTime())) return false;
      return date >= today;
    });
  },[bbsRows]);
  const upcomingBbsCount = upcomingBbsDeliveries.length;
  const upcomingBbsWeight = React.useMemo(
    () => upcomingBbsDeliveries.reduce((sum, row) => sum + (parseFloat(row.weight_tons) || 0), 0),
    [upcomingBbsDeliveries]
  );

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card title="Concrete poured" subtitle="Total volume logged" className="!p-5">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {heroLoading ? 'Loading…' : `${totalConcreteVolume.toLocaleString(undefined,{ minimumFractionDigits:1, maximumFractionDigits:1 })} m³`}
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Across {concreteRows.length} pours</p>
        </Card>
        <Card title="Workforce deployed" subtitle="Total headcount recorded" className="!p-5">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {heroLoading ? 'Loading…' : totalWorkers.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{manpowerRows.length} daily logs submitted</p>
        </Card>
        <Card title="Open issues" subtitle="Items still requiring action" className="!p-5">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {heroLoading ? 'Loading…' : openIssues}
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{issueRows.length} total issues tracked</p>
        </Card>
        <Card title="Active material orders" subtitle="Requests awaiting delivery" className="!p-5">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {heroLoading ? 'Loading…' : activeMaterials}
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{materialRows.length} records overall</p>
        </Card>
        <Card title="BBS deliveries scheduled" subtitle="Tonnage remaining" className="!p-5">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {heroLoading ? 'Loading…' : `${totalBbsWeight.toLocaleString(undefined,{ minimumFractionDigits:1, maximumFractionDigits:1 })} t`}
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{upcomingBbsCount} upcoming / {upcomingBbsWeight.toLocaleString(undefined,{ minimumFractionDigits:1, maximumFractionDigits:1 })} t scheduled</p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Concrete volume" subtitle="Daily pour totals">
          <div className="sr-only" id="dashboard-concrete-summary">
            {concreteSummary}
          </div>
          <ResponsiveContainer
            width="100%"
            height={250}
            role="img"
            aria-label="Bar chart showing logged concrete volume by date"
            aria-describedby="dashboard-concrete-summary"
          >
            <BarChart data={concreteData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="volume" fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="BBS deliveries" subtitle="Scheduled tonnage by date">
          <div className="sr-only" id="dashboard-bbs-summary">
            {bbsDeliverySummary}
          </div>
          <ResponsiveContainer
            width="100%"
            height={250}
            role="img"
            aria-label="Bar chart showing BBS deliveries by date"
            aria-describedby="dashboard-bbs-summary"
          >
            <BarChart data={bbsDeliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="weight" fill={COLORS[4]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Manpower" subtitle="Headcount trend">
          <div className="sr-only" id="dashboard-manpower-summary">
            {manpowerSummary}
          </div>
          <ResponsiveContainer
            width="100%"
            height={250}
            role="img"
            aria-label="Line chart showing manpower totals by date"
            aria-describedby="dashboard-manpower-summary"
          >
            <LineChart data={manpowerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip cursor={false} />
              <Line type="monotone" dataKey="workers" stroke={COLORS[1]} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Materials by status" subtitle="Distribution of requests">
          <div className="sr-only" id="dashboard-material-summary">
            {materialSummary}
          </div>
          <ResponsiveContainer
            width="100%"
            height={250}
            role="img"
            aria-label="Pie chart showing material records grouped by status"
            aria-describedby="dashboard-material-summary"
          >
            <PieChart>
              <Tooltip />
              <Pie data={materialData} dataKey="value" nameKey="name" outerRadius={100}>
                {materialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {(concreteError || manpowerError || issuesError || materialError || bbsError) && (
        <div className="rounded-2xl border border-red-300/80 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300" role="alert">
          {concreteError && <p>Concrete data error: {concreteError}</p>}
          {manpowerError && <p>Manpower data error: {manpowerError}</p>}
          {issuesError && <p>Issues data error: {issuesError}</p>}
          {materialError && <p>Materials data error: {materialError}</p>}
          {bbsError && <p>BBS schedule data error: {bbsError}</p>}
        </div>
      )}
    </section>
  );
}

function DailyTasksLog({ isAdmin, isSupervisor }){
  const defaultDate = React.useMemo(() => today(), []);
  const [selectedDate, setSelectedDate] = React.useState(defaultDate);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const { tasks, loading, error, refresh, addTask, updateTask, verifyTask, deleteTask } = useDailyTasks(selectedDate);
  const canManageStatus = isAdmin || isSupervisor;
  const readableDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
        new Date(`${selectedDate}T00:00:00`)
      );
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleAddTask = async (event) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;
    await addTask(newTaskTitle);
    setNewTaskTitle("");
  };

  const handleStatusChange = async (task, nextStatus) => {
    if (task.status === nextStatus) return;
    const patch = { status: nextStatus };
    if (nextStatus !== "completed") {
      patch.verified = false;
      patch.verified_by = null;
      patch.verified_at = null;
    }
    await updateTask(task.id, patch);
  };

  const handleVerify = async (task, shouldVerify) => {
    await verifyTask(task.id, shouldVerify);
  };

  const handleDelete = async (taskId) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this task?")) return;
    await deleteTask(taskId);
  };

  const handleSaveRemark = async (taskId, remark) => {
    await updateTask(taskId, { remarks: remark ? remark : null });
  };

  return (
    <section className="grid gap-4">
      <Card
        title="Manage daily tasks"
        subtitle="Assign tasks for the team and let supervisors update progress through the day."
      >
        <form
          onSubmit={handleAddTask}
          className="flex flex-col gap-4 rounded-2xl bg-white/40 p-4 text-sm shadow-sm ring-1 ring-white/40 backdrop-blur dark:bg-neutral-900/40 dark:ring-neutral-700/50 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Working date
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/70 dark:bg-neutral-900/70 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
            />
          </label>
          {canManageStatus && (
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  New task
                </span>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="e.g. Morning toolbox briefing"
                  className="mt-1 w-full rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/70 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
                disabled={!newTaskTitle.trim()}
              >
                Add task
              </button>
            </div>
          )}
        </form>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Tasks marked ongoing or rejected are automatically carried forward to the next working day. Supervisors can update
          progress while admins can finalise remarks and verifications.
        </p>
      </Card>

      <Card
        title={`Tasks for ${readableDate}`}
        actions={
          <div className="ml-auto flex items-center gap-2">
            <RefreshButton onClick={() => refresh()} />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {canManageStatus ? "Supervisors and admins can update status" : "Read-only access"}
            </span>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-2xl bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          {loading && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading tasks…</p>
          )}
          {!loading && !tasks.length && !error && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              No tasks recorded for this date yet. {canManageStatus ? "Add the first task to start the checklist." : "Ask an administrator to create the checklist."}
            </p>
          )}
          {!loading && tasks.length > 0 && (
            <div className="grid gap-3">
              {tasks.map((task) => (
                <DailyTaskItem
                  key={task.id}
                  task={task}
                  canManageStatus={canManageStatus}
                  isAdmin={isAdmin}
                  onStatusChange={handleStatusChange}
                  onVerify={handleVerify}
                  onDelete={handleDelete}
                  onSaveRemark={handleSaveRemark}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function DailyTaskItem({ task, canManageStatus, isAdmin, onStatusChange, onVerify, onDelete, onSaveRemark }){
  const [remark, setRemark] = React.useState(task.remarks || "");
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setRemark(task.remarks || "");
    setDirty(false);
  }, [task.id, task.remarks]);

  const statusLabel = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "";
  const taskDateLabel = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(`${task.task_date}T00:00:00`)
      );
    } catch (error) {
      return task.task_date;
    }
  }, [task.task_date]);
  const updatedAtLabel = React.useMemo(() => formatDateTime(task.updated_at), [task.updated_at]);
  const updatedByName = React.useMemo(() => {
    const profile = task.updated_by_profile || {};
    return profile.full_name?.trim() || profile.email || (task.updated_by ? "Team member" : "");
  }, [task.updated_by, task.updated_by_profile]);
  const updateMeta = React.useMemo(() => {
    if (!updatedAtLabel && !updatedByName) return "";
    const parts = [];
    if (updatedAtLabel) parts.push(updatedAtLabel);
    if (updatedByName) parts.push(`by ${updatedByName}`);
    return `Last updated ${parts.join(" ")}`.trim();
  }, [updatedAtLabel, updatedByName]);

  const handleSave = async () => {
    setSaving(true);
    await onSaveRemark(task.id, remark.trim());
    setSaving(false);
    setDirty(false);
  };

  const disableVerify = task.status !== "completed";

  return (
    <div className="rounded-3xl border border-neutral-200/70 bg-white/85 p-5 shadow-sm transition dark:border-neutral-700/70 dark:bg-neutral-900/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{task.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{taskDateLabel}</span>
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
                {statusLabel}
              </span>
              {task.carry_over_from && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                  Carried over
                </span>
              )}
              {task.verified && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                  Verified
                </span>
              )}
            </div>
            {updateMeta && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{updateMeta}</p>
            )}
          </div>
          {!isAdmin && task.remarks && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              <span className="font-semibold">Remarks:</span> {task.remarks}
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {canManageStatus ? (
            <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Status
              <select
                value={task.status}
                onChange={(event) => onStatusChange(task, event.target.value)}
                className="mt-1 w-40 rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/70 dark:bg-neutral-900/70 dark:text-neutral-100 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Status: {statusLabel}
            </p>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onVerify(task, !task.verified)}
              disabled={disableVerify && !task.verified}
              className="inline-flex items-center justify-center rounded-full border border-neutral-300/80 bg-white/80 px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/70 dark:bg-neutral-900/60 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
            >
              {task.verified ? "Remove verification" : "Verify task"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Remarks
            <textarea
              value={remark}
              onChange={(event) => {
                setRemark(event.target.value);
                setDirty(true);
              }}
              rows={3}
              placeholder="Explain why a task was delayed or rejected"
              className="mt-1 w-full rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/70 dark:bg-neutral-900/70 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-100/20"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
            >
              {saving ? "Saving…" : "Save remark"}
            </button>
            {dirty && <span className="text-neutral-500 dark:text-neutral-300">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ConcreteLog({isAdmin}){
  const { rows, insert, remove, clearAll, refresh, loading, error } = useTable('concrete');
  const newConcrete = () => ({ date: today(), pour_id:'', location:'', element:'', volume:'', mix:'', supplier:'', start_time:'', end_time:'', cubes:'', supervisor:'', notes:'' });
  const [d,setD]=React.useState(newConcrete());
  const add = async()=>{ if(!d.date||!d.location||!d.element) return alert('Date, Location, Element required'); await insert(d); setD(newConcrete()); };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes","created_at"]; download(`concrete_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <Card title="Log a Concrete Pour" subtitle="Capture placement details for your records.">
          <FormGrid>
            <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
            <Input label="Pour ID / Ref" value={d.pour_id} onChange={v=>setD({...d,pour_id:v})} />
            <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
            <Input label="Element" value={d.element} onChange={v=>setD({...d,element:v})} />
            <Input label="Volume (m³)" value={d.volume} onChange={v=>setD({...d,volume:v})} />
            <Input label="Mix / Grade" value={d.mix} onChange={v=>setD({...d,mix:v})} />
            <Input label="Supplier" value={d.supplier} onChange={v=>setD({...d,supplier:v})} />
            <Input label="Start Time" type="time" value={d.start_time} onChange={v=>setD({...d,start_time:v})} />
            <Input label="End Time" type="time" value={d.end_time} onChange={v=>setD({...d,end_time:v})} />
            <Input label="Cubes Taken" value={d.cubes} onChange={v=>setD({...d,cubes:v})} />
            <Input label="Supervisor" value={d.supervisor} onChange={v=>setD({...d,supervisor:v})} />
            <TextArea label="Notes" value={d.notes} onChange={v=>setD({...d,notes:v})} />
          </FormGrid>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={add}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
            >
              Add pour
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
              >
                Export CSV
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center justify-center rounded-xl border border-red-300/80 bg-red-50/80 px-4 py-2 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>
        </Card>
      </div>
      <div className="min-w-0 md:col-span-2">
        <Card title={`Records (${rows.length})`} actions={<div className="ml-auto"><RefreshButton onClick={refresh} /></div>}>
          <DataTable
            caption="Concrete pour records"
            columns={["date","pour_id","location","element","volume","mix","supplier","start_time","end_time","cubes","supervisor","notes"]}
            rows={rows}
            onDelete={isAdmin ? remove : undefined}
            loading={loading}
            error={error}
          />
        </Card>
      </div>
    </section>
  );
}

function ManpowerLog({isAdmin}){
  const { rows, remove, clearAll, refresh, loading, error } = useTable('manpower');
  const newManpower = () => ({
    date: today(),
    contractor: '',
    trade: '',
    workers: '',
    shift: '',
    level: '',
    zoneLetter: '',
    zoneNumber: '',
    supervisor: '',
    notes: '',
  });
  const [d,setD]=React.useState(newManpower());
  const [file,setFile]=React.useState(null);
  const [supportsHoursColumn, setSupportsHoursColumn] = React.useState(true);
  React.useEffect(() => {
    if (rows.length === 0) return;
    const hasHours = rows.some((row) => Object.prototype.hasOwnProperty.call(row, "hours"));
    setSupportsHoursColumn(hasHours);
  }, [rows]);
  const formattedRows = React.useMemo(() => rows.map((row) => {
    const { level, zoneLetter, zoneNumber } = parseManpowerZone(row.zone);
    const { notesText, photoUrl } = splitManpowerNotes(row.notes);
    const zoneArea = zoneLetter ? `Zone ${zoneLetter}${zoneNumber ? `-${zoneNumber}` : ''}` : (row.zone || '');
    return {
      ...row,
      shift: row.shift || row.hours || '',
      level: level || '',
      zone_area: zoneArea,
      notes: notesText,
      photo_url: photoUrl || '',
    };
  }), [rows]);
  const add = async()=>{
    if(!d.date||!d.contractor||!d.trade) return alert('Date, Contractor, Trade required');
    let photoUrl = '';
    if(file){
      try{
        photoUrl = await uploadToBucket('manpower-photos', file);
      }catch(e){
        alert(e.message);
      }
    }
    const zoneValue = formatManpowerZone(d.level, d.zoneLetter, d.zoneNumber);
    const notesValue = buildManpowerNotes(d.notes, photoUrl);
    const user = (await supabase.auth.getUser()).data.user;
    const basePayload = {
      date: d.date,
      contractor: d.contractor,
      trade: d.trade,
      workers: d.workers,
      shift: d.shift,
      zone: zoneValue,
      supervisor: d.supervisor,
      notes: notesValue,
      user_id: user?.id,
    };
    const attemptInsert = async (payload) => {
      const { error: insertError } = await supabase.from('manpower').insert(payload);
      return insertError;
    };
    let insertError = await attemptInsert(
      supportsHoursColumn ? { ...basePayload, hours: d.shift } : basePayload,
    );
    if (insertError) {
      const message = (insertError.message || "").toLowerCase();
      const hoursMissing = message.includes("'hours' column") || message.includes("column hours");
      if (supportsHoursColumn && hoursMissing) {
        setSupportsHoursColumn(false);
        insertError = await attemptInsert(basePayload);
      }
    }
    if (insertError) {
      alert(insertError.message);
      return;
    }
    setD(newManpower());
    setFile(null);
  };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","contractor","trade","workers","hours","zone","supervisor","notes","created_at"]; download(`manpower_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <Card title="Track Manpower" subtitle="Log labour resources allocated on site.">
          <FormGrid>
            <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
            <Input label="Contractor" value={d.contractor} onChange={v=>setD({...d,contractor:v})} />
            <Input label="Trade" value={d.trade} onChange={v=>setD({...d,trade:v})} />
            <Input label="Workers (count)" value={d.workers} onChange={v=>setD({...d,workers:v})} />
            <Select label="Shift" value={d.shift} onChange={v=>setD({...d,shift:v})} options={SHIFT_OPTIONS} />
            <Select label="Level" value={d.level} onChange={v=>setD({...d,level:v})} options={LEVEL_OPTIONS} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Zone" value={d.zoneLetter} onChange={v=>setD({...d,zoneLetter:v})} options={ZONE_LETTERS} />
              <Select label="Area" value={d.zoneNumber} onChange={v=>setD({...d,zoneNumber:v})} options={ZONE_NUMBERS} />
            </div>
            <Input label="Supervisor" value={d.supervisor} onChange={v=>setD({...d,supervisor:v})} />
            <TextArea label="Notes" value={d.notes} onChange={v=>setD({...d,notes:v})} />
            <label className="text-sm">
              <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">Upload Photo</div>
              <input
                type="file"
                accept="image/*"
                onChange={e=>setFile(e.target.files?.[0]||null)}
                className="w-full rounded-xl border border-dashed border-neutral-300/80 bg-white/60 px-3 py-3 text-xs text-neutral-500 shadow-sm transition file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-300 dark:file:bg-neutral-100 dark:file:text-neutral-900"
              />
            </label>
          </FormGrid>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={add}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
            >
              Add entry
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
              >
                Export CSV
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center justify-center rounded-xl border border-red-300/80 bg-red-50/80 px-4 py-2 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>
        </Card>
      </div>
      <div className="min-w-0 md:col-span-2">
        <Card title={`Records (${rows.length})`} actions={<div className="ml-auto"><RefreshButton onClick={refresh} /></div>}>
          <DataTable
            caption="Manpower log records"
            columns={["date","contractor","trade","workers","shift","level","zone_area","supervisor","notes","photo_url"]}
            rows={formattedRows}
            onDelete={isAdmin ? remove : undefined}
            loading={loading}
            error={error}
          />
        </Card>
      </div>
    </section>
  );
}

function IssuesLog({isAdmin}){
  const { rows, insert, remove, clearAll, refresh, loading, error } = useTable('issues');
  const newIssue = () => ({ date: today(), location:'', description:'', severity:'', status:'Open', raised_by:'', owner:'', due_by: today(), photo_url:'' });
  const [d,setD]=React.useState(newIssue());
  const [file,setFile]=React.useState(null);
  const add = async()=>{
    if(!d.date||!d.location||!d.description) return alert('Date, Location, Description required');
    let url=d.photo_url; if(file){ try{ url = await uploadToBucket('issue-photos', file);}catch(e){ alert(e.message);} }
    await insert({ ...d, photo_url:url }); setD(newIssue()); setFile(null);
  };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","location","description","severity","status","raised_by","owner","due_by","photo_url","created_at"]; download(`issues_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <Card title="Report Site Issues" subtitle="Flag safety, quality or coordination blockers."><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
        <TextArea label="Description" value={d.description} onChange={v=>setD({...d,description:v})} />
        <Select label="Severity" value={d.severity} onChange={v=>setD({...d,severity:v})} options={["Low","Medium","High","Critical"]} />
        <Select label="Status" value={d.status} onChange={v=>setD({...d,status:v})} options={["Open","In Progress","Blocked","Closed"]} />
        <Input label="Raised By" value={d.raised_by} onChange={v=>setD({...d,raised_by:v})} />
        <Input label="Owner" value={d.owner} onChange={v=>setD({...d,owner:v})} />
        <Input label="Due By" type="date" value={d.due_by} onChange={v=>setD({...d,due_by:v})} />
        <label className="text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">Photo</div>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="w-full rounded-xl border border-dashed border-neutral-300/80 bg-white/60 px-3 py-3 text-xs text-neutral-500 shadow-sm transition file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-300 dark:file:bg-neutral-100 dark:file:text-neutral-900" />
        </label>
      </FormGrid>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
        >
          Add issue
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
          >
            Export CSV
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center justify-center rounded-xl border border-red-300/80 bg-red-50/80 px-4 py-2 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
          >
            Clear all
          </button>
        )}
      </div></Card></div>
      <div className="min-w-0 md:col-span-2">
        <Card title={`Records (${rows.length})`} actions={<div className="ml-auto"><RefreshButton onClick={refresh} /></div>}>
          <DataTable
            caption="Issue log records"
            columns={["date","location","description","severity","status","raised_by","owner","due_by","photo_url"]}
            rows={rows}
            onDelete={isAdmin ? remove : undefined}
            loading={loading}
            error={error}
          />
        </Card>
      </div>
    </section>
  );
}

function MaterialsLog({isAdmin}){
  const { rows, insert, remove, clearAll, refresh, loading, error } = useTable('materials');
  const newMaterial = () => ({ date: today(), type:'Request', item:'', spec:'', qty:'', unit:'', needed_by: today(), supplier:'', po:'', status:'Pending', location:'', requester:'', photo_url:'' });
  const [d,setD]=React.useState(newMaterial());
  const [file,setFile]=React.useState(null);
  const add = async()=>{
    if(!d.date||!d.item) return alert('Date and Item required');
    let url=d.photo_url; if(file){ try{ url = await uploadToBucket('delivery-photos', file);}catch(e){ alert(e.message);} }
    await insert({ ...d, photo_url:url }); setD(newMaterial()); setFile(null);
  };
  const exportCSV = ()=>{ if(!isAdmin) return; const headers=["id","user_id","date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url","created_at"]; download(`materials_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers)); };
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <Card title="Manage Materials" subtitle="Track requests and deliveries at a glance."><FormGrid>
        <Input label="Date" type="date" value={d.date} onChange={v=>setD({...d,date:v})} />
        <Select label="Type" value={d.type} onChange={v=>setD({...d,type:v})} options={["Request","Delivery"]} />
        <Input label="Item" value={d.item} onChange={v=>setD({...d,item:v})} />
        <Input label="Specification" value={d.spec} onChange={v=>setD({...d,spec:v})} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Input label="Qty" value={d.qty} onChange={v=>setD({...d,qty:v})} /><Input label="Unit" value={d.unit} onChange={v=>setD({...d,unit:v})} /></div>
        <Input label="Needed By" type="date" value={d.needed_by} onChange={v=>setD({...d,needed_by:v})} />
        <Input label="Supplier" value={d.supplier} onChange={v=>setD({...d,supplier:v})} />
        <Input label="PO / Ref" value={d.po} onChange={v=>setD({...d,po:v})} />
        <Select label="Status" value={d.status} onChange={v=>setD({...d,status:v})} options={["Pending","Approved","Ordered","Delivered","Cancelled"]} />
        <Input label="Location / Zone" value={d.location} onChange={v=>setD({...d,location:v})} />
        <Input label="Requester" value={d.requester} onChange={v=>setD({...d,requester:v})} />
        <label className="text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">Delivery / MR Photo</div>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="w-full rounded-xl border border-dashed border-neutral-300/80 bg-white/60 px-3 py-3 text-xs text-neutral-500 shadow-sm transition file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-300 dark:file:bg-neutral-100 dark:file:text-neutral-900" />
        </label>
      </FormGrid>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
        >
          Add record
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
          >
            Export CSV
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center justify-center rounded-xl border border-red-300/80 bg-red-50/80 px-4 py-2 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
          >
            Clear all
          </button>
        )}
      </div></Card></div>
      <div className="min-w-0 md:col-span-2">
        <Card title={`Records (${rows.length})`} actions={<div className="ml-auto"><RefreshButton onClick={refresh} /></div>}>
          <DataTable
            caption="Material records"
            columns={["date","type","item","spec","qty","unit","needed_by","supplier","po","status","location","requester","photo_url"]}
            rows={rows}
            onDelete={isAdmin ? remove : undefined}
            loading={loading}
            error={error}
          />
        </Card>
      </div>
    </section>
  );
}

function BbsScheduleLog({isAdmin}){
  const { rows, insert, remove, clearAll, refresh, loading, error } = useTable('bbs_schedule');
  const newBbs = () => ({
    delivery_date: today(),
    element: '',
    bar_mark: '',
    diameter_mm: '',
    length_m: '',
    weight_tons: '',
    supplier: '',
    status: 'Planned',
    remarks: '',
  });
  const [d, setD] = React.useState(newBbs());
  const add = async () => {
    if (!d.delivery_date || !d.element || !d.bar_mark) {
      alert('Delivery date, Element and Bar Mark are required');
      return;
    }
    await insert(d);
    setD(newBbs());
  };
  const exportCSV = () => {
    if (!isAdmin) return;
    const headers = ['id','user_id','delivery_date','element','bar_mark','diameter_mm','length_m','weight_tons','supplier','status','remarks','created_at'];
    download(`bbs_schedule_${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows, headers));
  };
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <Card title="Plan BBS Deliveries" subtitle="Coordinate reinforcement drops with the site team.">
          <FormGrid>
            <Input label="Delivery date" type="date" value={d.delivery_date} onChange={v=>setD({...d,delivery_date:v})} />
            <Input label="Element / location" value={d.element} onChange={v=>setD({...d,element:v})} />
            <Input label="Bar mark" value={d.bar_mark} onChange={v=>setD({...d,bar_mark:v})} />
            <Input label="Diameter (mm)" value={d.diameter_mm} onChange={v=>setD({...d,diameter_mm:v})} />
            <Input label="Cut length (m)" value={d.length_m} onChange={v=>setD({...d,length_m:v})} />
            <Input label="Weight (t)" value={d.weight_tons} onChange={v=>setD({...d,weight_tons:v})} />
            <Input label="Supplier / fabricator" value={d.supplier} onChange={v=>setD({...d,supplier:v})} />
            <Select label="Status" value={d.status} onChange={v=>setD({...d,status:v})} options={["Planned","Confirmed","Delivered","Delayed","Cancelled"]} />
            <TextArea label="Remarks" value={d.remarks} onChange={v=>setD({...d,remarks:v})} />
          </FormGrid>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={add}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-neutral-100 dark:text-neutral-900 dark:focus-visible:outline-neutral-300"
            >
              Add delivery
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-900/70 dark:text-neutral-200 dark:focus-visible:outline-neutral-300"
              >
                Export CSV
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center justify-center rounded-xl border border-red-300/80 bg-red-50/80 px-4 py-2 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/70 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>
        </Card>
      </div>
      <div className="min-w-0 md:col-span-2">
        <Card title={`Schedule (${rows.length})`} actions={<div className="ml-auto"><RefreshButton onClick={refresh} /></div>}>
          <DataTable
            caption="BBS delivery schedule"
            columns={["delivery_date","element","bar_mark","diameter_mm","length_m","weight_tons","supplier","status","remarks"]}
            rows={rows}
            onDelete={isAdmin ? remove : undefined}
            loading={loading}
            error={error}
          />
        </Card>
      </div>
    </section>
  );
}
