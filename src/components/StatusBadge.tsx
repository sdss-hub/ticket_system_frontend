import { TicketStatus } from '../api/types';

const statusStyles: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  [TicketStatus.InProgress]: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  [TicketStatus.Resolved]: 'bg-green-50 text-green-700 ring-green-600/20',
  [TicketStatus.Closed]: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

const labels: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
