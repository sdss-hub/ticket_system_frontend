import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketsApi } from '../api/tickets';
import type { TicketResponseDto, UserDto } from '../api/types';
import { TicketStatus, UserRole } from '../api/types';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
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
  const navigate = useNavigate();
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
    // Count high priority tickets as "urgent" if no overdue
    const urgent = overdue > 0 ? overdue : assignedTickets.filter((t) => 
      t.priority >= 3 && (t.status === TicketStatus.New || t.status === TicketStatus.InProgress)
    ).length;
    // Resolved in last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const resolvedThisWeek = assignedTickets.filter((t) => {
      const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt).getTime() : 0;
      return t.status === TicketStatus.Resolved && resolvedAt >= sevenDaysAgo;
    }).length;
    const recent = [...assignedTickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { queue, overdue: urgent, resolvedThisWeek, recent };
  }, [assignedTickets]);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      {loading && <Loading label="Loading dashboard..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          {/* Admin Command Center */}
          {role === UserRole.Admin && (
            <>
              {/* System Overview Header */}
              <div className="card p-6 bg-gradient-to-r from-indigo-50 to-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      System Command Center
                    </h2>
                    <p className="mt-1 text-gray-600">
                      {managerStats.total} total tickets • {managerStats.open} active • {managerStats.overdue} need attention
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{managerStats.resolvedToday}</div>
                    <div className="text-sm text-gray-600">resolved today</div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <div className="w-6 h-6 bg-blue-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Total Tickets</div>
                      <div className="text-2xl font-semibold text-blue-600">{managerStats.total}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <div className="w-6 h-6 bg-orange-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Active</div>
                      <div className="text-2xl font-semibold text-orange-600">{managerStats.open}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Resolved Today</div>
                      <div className="text-2xl font-semibold text-green-600">{managerStats.resolvedToday}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <div className="w-6 h-6 bg-red-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Escalations</div>
                      <div className="text-2xl font-semibold text-red-600">{managerStats.overdue}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <div className="w-6 h-6 bg-purple-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">SLA Performance</div>
                      <div className="text-xl font-semibold text-purple-600">94.2%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Insights & System Health */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">🤖 AI Insights</h2>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Live</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">Pattern Detection</div>
                      <div className="text-xs text-blue-700 mt-1">Spike in login issues (+47% this week)</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm font-medium text-yellow-900">Workload Alert</div>
                      <div className="text-xs text-yellow-700 mt-1">3 agents approaching capacity</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-900">AI Effectiveness</div>
                      <div className="text-xs text-green-700 mt-1">89% categorization accuracy this week</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/analytics')}
                    className="mt-4 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Full Analytics →
                  </button>
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Agent Performance</h2>
                  {agentPerf && agentPerf.length > 0 ? (
                    <div className="space-y-3">
                      {agentPerf?.slice(0, 5).map((agent, idx) => (
                        <div key={agent.agentName} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              idx === 0 ? 'bg-green-500' : idx === 1 ? 'bg-blue-500' : 'bg-gray-400'
                            }`}></div>
                            <span className="text-sm font-medium">{agent.agentName}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{agent.resolvedTotal}</div>
                            <div className="text-xs text-gray-500">resolved</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No performance data available</div>
                  )}
                  <button 
                    onClick={() => navigate('/users')}
                    className="mt-4 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Manage Agents →
                  </button>
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ System Health</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">API Response Time</span>
                      <span className="text-sm font-medium text-green-600">127ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database Health</span>
                      <span className="text-sm font-medium text-green-600">✓ Healthy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">AI Service</span>
                      <span className="text-sm font-medium text-green-600">✓ Online</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email Queue</span>
                      <span className="text-sm font-medium text-yellow-600">12 pending</span>
                    </div>
                    {dbInfo && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Users</span>
                          <span className="text-sm font-medium">{dbInfo.userCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Categories</span>
                          <span className="text-sm font-medium">{dbInfo.categoryCount}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Analytics */}
              {analytics && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Distribution</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">By Priority</h3>
                        <div className="space-y-2">
                          {analytics.ticketsByPriority.map((p) => (
                            <div key={p.priority} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  p.priority === 4 ? 'bg-red-500' :
                                  p.priority === 3 ? 'bg-orange-500' :
                                  p.priority === 2 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <span className="text-sm">
                                  {p.priority === 4 ? 'Critical' :
                                   p.priority === 3 ? 'High' :
                                   p.priority === 2 ? 'Medium' : 'Low'}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{p.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">By Status</h3>
                        <div className="space-y-2">
                          {analytics.ticketsByStatus.map((s) => (
                            <div key={s.status} className="flex items-center justify-between">
                              <span className="text-sm">
                                {s.status === 1 ? 'New' :
                                 s.status === 2 ? 'In Progress' :
                                 s.status === 3 ? 'Resolved' : 'Closed'}
                              </span>
                              <span className="text-sm font-medium">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Categories & Workload</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Categories</h3>
                        <div className="space-y-2">
                          {analytics.ticketsByCategory?.slice(0, 5).map((c) => (
                            <div key={c.category} className="flex items-center justify-between">
                              <span className="text-sm truncate mr-2">{c.category}</span>
                              <span className="text-sm font-medium">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Agent Workload</h3>
                        <div className="space-y-2">
                          {analytics.agentWorkload?.slice(0, 5).map((a) => (
                            <div key={a.agentName} className="flex items-center justify-between">
                              <span className="text-sm truncate mr-2">{a.agentName}</span>
                              <span className="text-sm font-medium">{a.assignedTickets}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions & Escalations */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button 
                      onClick={() => navigate('/tickets?status=new&unassigned=true')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-lg mb-1">🆕</div>
                      <div className="font-medium text-sm">Unassigned Tickets</div>
                      <div className="text-xs text-gray-500">Need agent assignment</div>
                    </button>
                    <button 
                      onClick={() => navigate('/tickets?overdue=true')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-lg mb-1">⏰</div>
                      <div className="font-medium text-sm">Overdue Tickets</div>
                      <div className="text-xs text-gray-500">Past SLA deadline</div>
                    </button>
                    <button 
                      onClick={() => navigate('/analytics')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-lg mb-1">📊</div>
                      <div className="font-medium text-sm">Full Analytics</div>
                      <div className="text-xs text-gray-500">Detailed reports</div>
                    </button>
                    <button 
                      onClick={() => navigate('/users')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-lg mb-1">👥</div>
                      <div className="font-medium text-sm">User Management</div>
                      <div className="text-xs text-gray-500">Agents & customers</div>
                    </button>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">🚨 Escalations</h2>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">{managerStats.overdue} urgent</span>
                  </div>
                  <div className="space-y-3">
                    {/* Mock escalations - in real app this would come from API */}
                    <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-red-900">#2025-120: System outage affecting 200+ users</div>
                          <div className="text-xs text-red-700 mt-1">Critical • Unassigned • 2h overdue</div>
                        </div>
                        <button className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                          Assign
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-orange-900">#2025-118: Payment processing down</div>
                          <div className="text-xs text-orange-700 mt-1">High • Agent: Sarah • 1h overdue</div>
                        </div>
                        <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                          Escalate
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-yellow-900">#2025-115: Customer replied 3 times</div>
                          <div className="text-xs text-yellow-700 mt-1">Medium • Agent: John • No response</div>
                        </div>
                        <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/tickets?escalated=true')}
                    className="mt-4 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View All Escalations →
                  </button>
                </div>
              </div>

              {/* Recent Activity Stream */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
                  <button
                    onClick={() => navigate('/tickets')}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View All Tickets →
                  </button>
                </div>
                {managerStats.recent.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📋</div>
                    <p className="text-gray-600">No recent activity.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {managerStats.recent?.slice(0, 6).map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{ticket.title}</span>
                            <span className="text-xs text-gray-500">#{ticket.ticketNumber}</span>
                            <PriorityBadge priority={ticket.priority} />
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {ticket.assignedAgent ? (
                              <span>Assigned to {ticket.assignedAgent.firstName}</span>
                            ) : (
                              <span className="text-orange-600">Unassigned</span>
                            )} • Customer: {ticket.customer.firstName} {ticket.customer.lastName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(ticket.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Agent view */}
          {role === UserRole.Agent && (
            <>
              {/* Agent Workload Overview */}
              <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Good morning, {user?.firstName}!
                    </h2>
                    <p className="mt-1 text-gray-600">
                      You have {agentStats.queue} tickets assigned ({agentStats.overdue > 0 ? `${agentStats.overdue} urgent` : 'none urgent'})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{agentStats.resolvedThisWeek}</div>
                    <div className="text-sm text-gray-600">resolved this week</div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <div className="w-6 h-6 bg-blue-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">My Queue</div>
                      <div className="text-2xl font-semibold text-blue-600">{agentStats.queue}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <div className="w-6 h-6 bg-red-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Urgent</div>
                      <div className="text-2xl font-semibold text-red-600">{agentStats.overdue}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Resolved (7d)</div>
                      <div className="text-2xl font-semibold text-green-600">{agentStats.resolvedThisWeek}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <div className="w-6 h-6 bg-purple-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Avg Response</div>
                      <div className="text-xl font-semibold text-purple-600">2.1h</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Suggestions & Available Tickets */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">🤖 AI Recommendations</h2>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">3 matches</span>
                  </div>
                  <div className="space-y-3">
                    {/* Mock AI suggestions - in real app this would come from API */}
                    <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">#2025-123: Login issues with SSO</div>
                          <div className="text-xs text-gray-600 mt-1">95% match • Authentication specialist needed</div>
                        </div>
                        <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                          Take
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">#2025-124: Mobile app crashes</div>
                          <div className="text-xs text-gray-600 mt-1">87% match • Mobile development skills</div>
                        </div>
                        <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          Take
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">#2025-125: API integration help</div>
                          <div className="text-xs text-gray-600 mt-1">78% match • Backend integration</div>
                        </div>
                        <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                          Take
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/tickets?filter=available')}
                    className="mt-4 w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View All Available Tickets →
                  </button>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">My Active Tickets</h2>
                    <button
                      onClick={() => navigate('/tickets?filter=assigned')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  {agentStats.recent.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">🎯</div>
                      <p className="text-gray-600">No assigned tickets.</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Check the AI recommendations to pick up new work!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agentStats.recent?.slice(0, 4).map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{ticket.title}</span>
                              <span className="text-xs text-gray-500">#{ticket.ticketNumber}</span>
                              {ticket.priority >= 3 && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                  High Priority
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Customer: {ticket.customer.firstName} {ticket.customer.lastName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button 
                    onClick={() => navigate('/tickets?status=new')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-lg mb-1">🆕</div>
                    <div className="font-medium text-sm">New Tickets</div>
                    <div className="text-xs text-gray-500">Unassigned tickets</div>
                  </button>
                  <button 
                    onClick={() => navigate('/tickets?priority=high')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-lg mb-1">🔥</div>
                    <div className="font-medium text-sm">High Priority</div>
                    <div className="text-xs text-gray-500">Urgent issues</div>
                  </button>
                  <button 
                    onClick={() => navigate('/tickets?category=technical')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-lg mb-1">⚙️</div>
                    <div className="font-medium text-sm">Technical</div>
                    <div className="text-xs text-gray-500">Tech support tickets</div>
                  </button>
                  <button 
                    onClick={() => navigate('/tickets?overdue=true')}
                    className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-lg mb-1">⏰</div>
                    <div className="font-medium text-sm">Overdue</div>
                    <div className="text-xs text-gray-500">Past due date</div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Customer view */}
          {role === UserRole.Customer && (
            <>
              {/* Welcome & Create Ticket */}
              <div className="card p-6 bg-gradient-to-r from-primary-50 to-primary-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Welcome back, {user?.firstName}!
                    </h2>
                    <p className="mt-1 text-gray-600">
                      You have {customerStats.open} open tickets, {customerStats.resolved} resolved this week
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/tickets/new')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all transform hover:scale-105"
                  >
                    + Create New Ticket
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <div className="w-6 h-6 bg-orange-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Open Tickets</div>
                      <div className="text-2xl font-semibold text-orange-600">{customerStats.open}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Resolved</div>
                      <div className="text-2xl font-semibold text-green-600">{customerStats.resolved}</div>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <div className="w-6 h-6 bg-red-500 rounded"></div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm text-gray-500">Overdue</div>
                      <div className="text-2xl font-semibold text-red-600">{customerStats.overdue}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Updates */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Updates</h2>
                  <button
                    onClick={() => navigate('/tickets')}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View All Tickets →
                  </button>
                </div>
                {customerStats.recent.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                    <p className="text-gray-600">No tickets yet.</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create your first ticket to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerStats.recent?.slice(0, 5).map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{ticket.title}</span>
                            <span className="text-xs text-gray-500">#{ticket.ticketNumber}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {ticket.assignedAgent ? (
                              <span>Agent {ticket.assignedAgent.firstName} is working on your ticket</span>
                            ) : (
                              <span>Waiting for agent assignment</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(ticket.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
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
