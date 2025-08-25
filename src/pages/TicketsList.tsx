import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import TicketCard from '../components/TicketCard';
import { TicketsApi } from '../api/tickets';
import { TicketResponseDto, TicketStatus, Priority, UserDto, UserRole } from '../api/types';
import FilterPanel, { type TicketFiltersUI } from '../components/FilterPanel';
import { UsersApi } from '../api/users';
import { useAuth } from '../state/AuthContext';

export default function TicketsList() {
  const { user } = useAuth();
  const location = useLocation();
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TicketFiltersUI>({});
  const [agents, setAgents] = useState<UserDto[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Determine page type based on route
  const pageType = useMemo(() => {
    if (location.pathname === '/tickets/assigned') return 'assigned';
    if (location.pathname === '/tickets/available') return 'available';
    return 'all';
  }, [location.pathname]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let res: TicketResponseDto[];
      
      if (pageType === 'assigned' && user) {
        // Load tickets assigned to current agent
        res = await TicketsApi.list({
          search,
          status: filters.status,
          agentId: user.id,
        });
      } else if (pageType === 'available') {
        // Load unassigned tickets
        res = await TicketsApi.list({
          search,
          status: filters.status,
          agentId: undefined, // Unassigned tickets
        });
      } else {
        // Load all tickets (admin view)
        res = await TicketsApi.list({
          search,
          status: filters.status,
          agentId: filters.agentId,
        });
      }
      
      setTickets(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // load available agents for filtering
    UsersApi.list(UserRole.Agent)
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);

  const sorted = useMemo(() => {
    const arr = [...tickets];
    arr.sort((a, b) => {
      if (sortBy === 'createdAt')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'priority') return (b.priority as number) - (a.priority as number);
      if (sortBy === 'status') return (a.status as number) - (b.status as number);
      return 0;
    });
    return arr;
  }, [tickets, sortBy]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {pageType === 'assigned' ? 'My Assigned Tickets' : 
           pageType === 'available' ? 'Available Tickets' : 
           'All Tickets'}
        </h1>
      </div>
      <div className="card p-4 flex items-center justify-between gap-4">
        <SearchBar
          onSearch={(q) => {
            setSearch(q);
          }}
          placeholder="Search tickets..."
        />
        <FilterPanel
          filters={filters}
          agents={agents}
          onChange={setFilters}
          onApply={() => {
            setPage(1);
            load();
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{tickets.length} result(s)</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort</label>
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Newest</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
      {loading && <Loading label="Loading tickets..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.length === 0 ? (
            <div className="col-span-full text-sm text-gray-600">No tickets found.</div>
          ) : (
            paged.map((t) => <TicketCard key={t.id} ticket={t} />)
          )}
        </div>
      )}
      {!loading && !error && sorted.length > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-primary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">
            Page {page} / {Math.ceil(sorted.length / pageSize)}
          </div>
          <button
            className="btn-primary"
            disabled={page >= Math.ceil(sorted.length / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
