import './globals.css';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

export const metadata = {
  title: 'ReachInbox - Email Scheduler & Rate Limiter Engine',
  description: 'Production-grade full-stack cold email automation platform powered by Express, BullMQ, Redis, MySQL, and Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090D16] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
