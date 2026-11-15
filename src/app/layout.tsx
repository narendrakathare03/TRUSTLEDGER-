import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'TrustLedger | Trusted AI Memory',description:'A trust-scored memory store for AI agents'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
