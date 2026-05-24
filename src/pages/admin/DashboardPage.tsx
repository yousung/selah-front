import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Stats {
  users: number;
  videos: number;
  playlists: number;
}

export function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data;
    },
  });

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-6"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>대시보드</h1>
      </header>

      <div className="p-6">
        {isLoading && (
          <p style={{ color: 'var(--ink-2)' }}>로딩 중...</p>
        )}
        {error && (
          <p style={{ color: 'var(--error)' }}>오류가 발생했습니다.</p>
        )}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="전체 사용자" value={stats.users} />
            <StatCard label="등록된 영상" value={stats.videos} />
            <StatCard label="플레이리스트" value={stats.playlists} />
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card p-6">
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--ink-2)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: 'var(--ink-0)' }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
