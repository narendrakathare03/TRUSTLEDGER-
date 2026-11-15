'use client';
import { FormEvent,useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AuthForm({mode}:{mode:'login'|'register'}){
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');router.push('/dashboard');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to continue');}finally{setBusy(false);}}
 return <form className="auth-form" onSubmit={submit}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required minLength={mode==='register'?3:1}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} required minLength={mode==='register'?8:1}/></label>{error&&<p className="error">{error}</p>}<button className="btn btn-primary full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button></form>
}
