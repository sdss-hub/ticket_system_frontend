import { useEffect, useMemo, useState } from 'react';
import { TicketsApi } from '../api/tickets';
import type { TicketResponseDto, UserDto } from '../api/types';
import { TicketStatus, UserRole } from '../api/types';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';
import {
  AnalyticsApi,
  type DashboardOverviewDto,
  type AgentPerformanceDto,
  type CustomerInsightsDto,
} from '../api/analytics';
import { HealthApi, type DatabaseInfoDto } from '../api/health';
import { useAuth } from '../state/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  // General/all tickets (manager view or general recent list)
  const [ticketsAll, setTicketsAll] = useState<TicketResponseDto[]>([]);
  // Tickets specific to the signed-in user
  const [myTickets, setMyTickets] = useState<TicketResponseDto[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<TicketResponseDto[]>([]);

  const [analytics, setAnalytics] = useState<DashboardOverviewDto | null>(null);
  const [agentPerf, setAgentPerf] = useState<AgentPerformanceDto[] | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsightsDto[] | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Always try to fetch health and high-level analytics
        const basePromises: Array<Promise<any>> = [
          HealthApi.database().catch(() => null),
          AnalyticsApi.dashboard().catch(() => null),
        ];

        // Role-aware data fetching
        if (role === UserRole.Customer && user) {
          basePromises.push(TicketsApi.list({ customerId: user.id }).catch(() => []));
        } else if (role === UserRole.Agent && user) {
          basePromises.push(TicketsApi.list({ agentId: user.id }).catch(() => []));
        } else if (role === UserRole.Admin) {
          basePromises.push(TicketsApi.list().catch(() => []));
          basePromises.push(AnalyticsApi.agentPerformance().catch(() => null));
          basePromises.push(AnalyticsApi.customerInsights().catch(() => null));
        }

        const results = await Promise.all(basePromises);

        // Map results back based on what we requested
        // Always first two: dbInfo, analytics
        const dbRes = results[0] as DatabaseInfoDto | null;
        const analyticsRes = results[1] as DashboardOverviewDto | null;

        if (dbRes) setDbInfo(dbRes);
        if (analyticsRes) setAnalytics(analyticsRes);

        // Remaining depend on role
        if (role === UserRole.Customer && user) {
          const mine = results[2] as TicketResponseDto[];
          setMyTickets(mine ?? []);
        } else if (role === UserRole.Agent && user) {
          const assigned = results[2] as TicketResponseDto[];
          setAssignedTickets(assigned ?? []);
        } else if (role === UserRole.Admin) {
          const all = results[2] as TicketResponseDto[];
          const perf = (results[3] as AgentPerformanceDto[] | null) ?? null;
          const cust = (results[4] as CustomerInsightsDto[] | null) ?? null;
          setTicketsAll(all ?? []);
          setAgentPerf(perf);
          setCustomerInsights(cust);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
    // Re-run when user/role changes
  }, [role, user?.id]);

  const managerStats = useMemo(() => {
    // Prefer analytics if available
    if (analytics) {
      const byStatusMap: Record<number, number> = {};
      analytics.ticketsByStatus.forEach((s) => (byStatusMap[s.status] = s.count));
      return {
        total: analytics.totalTickets,
        open: analytics.openTickets,
        resolvedToday: analytics.resolvedToday,
        overdue: analytics.overdueTickets,
        byStatus: {
          [TicketStatus.New]: byStatusMap[TicketStatus.New] ?? 0,
          [TicketStatus.InProgress]: byStatusMap[TicketStatus.InProgress] ?? 0,
          [TicketStatus.Resolved]: byStatusMap[TicketStatus.Resolved] ?? 0,
          [TicketStatus.Closed]: byStatusMap[TicketStatus.Closed] ?? 0,
        },
        recent: ticketsAll
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6),
      };
    }
    const total = ticketsAll.length;
    const byStatus = {
      [TicketStatus.New]: ticketsAll.filter((t) => t.status === TicketStatus.New).length,
      [TicketStatus.InProgress]: ticketsAll.filter((t) => t.status === TicketStatus.InProgress).length,
      [TicketStatus.Resolved]: ticketsAll.filter((t) => t.status === TicketStatus.Resolved).length,
      [TicketStatus.Closed]: ticketsAll.filter((t) => t.status === TicketStatus.Closed).length,
    } as Record<number, number>;
    const open = byStatus[TicketStatus.New] + byStatus[TicketStatus.InProgress];
    const recent = [...ticketsAll]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { total, open, resolvedToday: 0, overdue: 0, byStatus, recent };
  }, [analytics, ticketsAll]);

  const customerStats = useMemo(() => {
    const open = myTickets.filter(
      (t) => t.status === TicketStatus.New || t.status === TicketStatus.InProgress,
    ).length;
    const resolved = myTickets.filter((t) => t.status === TicketStatus.Resolved).length;
    const overdue = myTickets.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      const closed = t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed;
      return !closed && due < Date.now();
    }).length;
    const recent = [...myTickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { open, resolved, overdue, recent };
  }, [myTickets]);

  const agentStats = useMemo(() => {
    const queue = assignedTickets.filter(
      (t) => t.status === TicketStatus.New || t.status === TicketStatus.InProgress,
    ).length;
    const overdue = assignedTickets.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      const closed = t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed;
      return !closed && due < Date.now();
    }).length;
    // Resolved in last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const resolvedThisWeek = assignedTickets.filter((t) => {
      const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt).getTime() : 0;
      return t.status === TicketStatus.Resolved && resolvedAt >= sevenDaysAgo;
    }).length;
    const recent = [...assignedTickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { queue, overdue, resolvedThisWeek, recent };
  }, [assignedTickets]);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      {loading && <Loading label="Loading dashboard..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          {/* Manager/Admin view */}
          {role === UserRole.Admin && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Total Tickets</div>
                  <div className="mt-2 text-2xl font-semibold">{managerStats.total}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Open</div>
                  <div className="mt-2 text-2xl font-semibold">{managerStats.open}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Resolved Today</div>
                  <div className="mt-2 text-2xl font-semibold">{managerStats.resolvedToday}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Overdue</div>
                  <div className="mt-2 text-2xl font-semibold">{managerStats.overdue}</div>
                </div>
              </div>

              {analytics && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="card p-4">
                    <div className="text-sm font-medium text-gray-900">By Priority</div>
                    <ul className="mt-2 text-sm text-gray-700 space-y-1">
                      {analytics.ticketsByPriority.map((p) => (
                        <li key={p.priority} className="flex justify-between">
                          <span>Priority {p.priority}</span>
                          <span className="font-medium">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm font-medium text-gray-900">By Category</div>
                    <ul className="mt-2 text-sm text-gray-700 space-y-1">
                      {analytics.ticketsByCategory.slice(0, 8).map((c) => (
                        <li key={c.category} className="flex justify-between">
                          <span className="truncate mr-2">{c.category}</span>
                          <span className="font-medium">{c.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card p-4">
                    <div className="text-sm font-medium text-gray-900">Agent Workload (Top 5)</div>
                    <ul className="mt-2 text-sm text-gray-700 space-y-1">
                      {analytics.agentWorkload.slice(0, 5).map((a) => (
                        <li key={a.agentName} className="flex justify-between">
                          <span className="truncate mr-2">{a.agentName}</span>
                          <span className="font-medium">{a.assignedTickets}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

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
                {managerStats.recent.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">No recent tickets.</p>
                ) : (
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {managerStats.recent.map((t) => (
                      <TicketCard key={t.id} ticket={t} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Agent view */}
          {role === UserRole.Agent && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="card p-4">
                  <div className="text-sm text-gray-500">My Queue</div>
                  <div className="mt-2 text-2xl font-semibold">{agentStats.queue}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Overdue in Queue</div>
                  <div className="mt-2 text-2xl font-semibold">{agentStats.overdue}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Resolved (7d)</div>
                  <div className="mt-2 text-2xl font-semibold">{agentStats.resolvedThisWeek}</div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900">My Assigned (Recent)</h2>
                {agentStats.recent.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">No assigned tickets.</p>
                ) : (
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agentStats.recent.map((t) => (
                      <TicketCard key={t.id} ticket={t} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Customer view */}
          {role === UserRole.Customer && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="card p-4">
                  <div className="text-sm text-gray-500">My Open Tickets</div>
                  <div className="mt-2 text-2xl font-semibold">{customerStats.open}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Resolved</div>
                  <div className="mt-2 text-2xl font-semibold">{customerStats.resolved}</div>
                </div>
                <div className="card p-4">
                  <div className="text-sm text-gray-500">Overdue</div>
                  <div className="mt-2 text-2xl font-semibold">{customerStats.overdue}</div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900">My Recent Tickets</h2>
                {customerStats.recent.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">No recent tickets.</p>
                ) : (
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerStats.recent.map((t) => (
                      <TicketCard key={t.id} ticket={t} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
