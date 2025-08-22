import { useEffect, useMemo, useState } from 'react';
import { TicketsApi } from '../api/tickets';
import type { TicketResponseDto } from '../api/types';
import { TicketStatus } from '../api/types';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';

export default function Dashboard() {
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await TicketsApi.list();
        setTickets(res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const stats = useMemo(() => {
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
