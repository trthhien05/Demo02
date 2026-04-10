import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import AuthProvider from '@/components/providers/AuthProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="pl-72 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
