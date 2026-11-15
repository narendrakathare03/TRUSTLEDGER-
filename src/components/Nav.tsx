'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function Nav({username}:{username:string}){
 const router=useRouter();
 async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.push('/login');router.refresh();}
 return <header className="topbar"><Link className="brand" href="/dashboard"><span className="brand-mark">T</span> TrustLedger</Link><nav><Link href="/dashboard">Dashboard</Link><Link href="/memories/new">Add memory</Link><Link href="/conflicts">Conflicts</Link></nav><div className="nav-user"><span>{username}</span><button className="btn btn-ghost" onClick={logout}>Log out</button></div></header>
}
