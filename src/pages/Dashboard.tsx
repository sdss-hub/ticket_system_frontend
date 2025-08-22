import { useEffect, useMemo, useState } from 'react';
import { TicketsApi } from '../api/tickets';
import type { TicketResponseDto } from '../api/types';
import { TicketStatus } from '../api/types';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';
import { AnalyticsApi, type DashboardOverviewDto } from '../api/analytics';
import { HealthApi, type DatabaseInfoDto } from '../api/health';

export default function Dashboard() {
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [analytics, setAnalytics] = useState<DashboardOverviewDto | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ticketsRes, analyticsRes, dbRes] = await Promise.all([
          TicketsApi.list(),
          AnalyticsApi.dashboard().catch(() => null),
          HealthApi.database().catch(() => null),
        ]);
        setTickets(ticketsRes);
        if (analyticsRes) setAnalytics(analyticsRes);
        if (dbRes) setDbInfo(dbRes);
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const stats = useMemo(() => {
    if (analytics) {
      const byStatusMap: Record<number, number> = {};
      analytics.ticketsByStatus.forEach((s) => (byStatusMap[s.status] = s.count));
      return {
        total: analytics.totalTickets,
        byStatus: {
          [TicketStatus.New]: byStatusMap[TicketStatus.New] ?? 0,
          [TicketStatus.InProgress]: byStatusMap[TicketStatus.InProgress] ?? 0,
          [TicketStatus.Resolved]: byStatusMap[TicketStatus.Resolved] ?? 0,
          [TicketStatus.Closed]: byStatusMap[TicketStatus.Closed] ?? 0,
        },
        recent: tickets
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6),
      };
    }
    const total = tickets.length;
    const byStatus = {
      [TicketStatus.New]: tickets.filter((t) => t.status === TicketStatus.New).length,
      [TicketStatus.InProgress]: tickets.filter((t) => t.status === TicketStatus.InProgress).length,
      [TicketStatus.Resolved]: tickets.filter((t) => t.status === TicketStatus.Resolved).length,
      [TicketStatus.Closed]: tickets.filter((t) => t.status === TicketStatus.Closed).length,
    };
    const recent = [...tickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { total, byStatus, recent };
  }, [tickets]);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      {loading && <Loading label="Loading dashboard..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <div className="text-sm text-gray-500">Total Tickets</div>
              <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-gray-500">New</div>
              <div className="mt-2 text-2xl font-semibold">{stats.byStatus[TicketStatus.New]}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-gray-500">In Progress</div>
              <div className="mt-2 text-2xl font-semibold">
                {stats.byStatus[TicketStatus.InProgress]}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-gray-500">Resolved</div>
              <div className="mt-2 text-2xl font-semibold">
                {stats.byStatus[TicketStatus.Resolved]}
              </div>
            </div>
          </div>
          {dbInfo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-4">
                <div className="text-sm text-gray-500">Users</div>
                <div className="mt-1 text-xl font-semibold">{dbInfo.userCount}</div>
              </div>
              <div className="card p-4">
                <div className="text-sm text-gray-500">Categories</div>
                <div className="mt-1 text-xl font-semibold">{dbInfo.categoryCount}</div>
              </div>
            </div>
          )}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
            {stats.recent.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No recent tickets.</p>
            ) : (
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.recent.map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
