import { TicketStatus, Priority, UserDto } from '../api/types';

export interface TicketFiltersUI {
  status?: TicketStatus;
  priority?: Priority;
  agentId?: number;
}

export default function FilterPanel({
  filters,
  agents,
  onChange,
  onApply,
}: {
  filters: TicketFiltersUI;
  agents: UserDto[];
  onChange: (f: TicketFiltersUI) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input w-44"
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            status: e.target.value === '' ? undefined : (Number(e.target.value) as TicketStatus),
          })
        }
      >
        <option value="">All Statuses</option>
        <option value={TicketStatus.New}>New</option>
        <option value={TicketStatus.InProgress}>In Progress</option>
        <option value={TicketStatus.Resolved}>Resolved</option>
        <option value={TicketStatus.Closed}>Closed</option>
      </select>
      <select
        className="input w-44"
        value={filters.priority ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            priority: e.target.value === '' ? undefined : (Number(e.target.value) as Priority),
          })
        }
      >
        <option value="">All Priorities</option>
        <option value={Priority.Low}>Low</option>
        <option value={Priority.Medium}>Medium</option>
        <option value={Priority.High}>High</option>
        <option value={Priority.Critical}>Critical</option>
      </select>
      <select
        className="input w-56"
        value={filters.agentId ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            agentId: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
      >
        <option value="">Any Agent</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.fullName || a.email}
          </option>
        ))}
      </select>
      <button className="btn-primary" onClick={onApply}>
        Apply
      </button>
    </div>
  );
}
