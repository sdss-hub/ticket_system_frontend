import { TicketResponseDto } from '../api/types';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { Link } from 'react-router-dom';

export default function TicketCard({ ticket }: { ticket: TicketResponseDto }) {
  return (
    <Link to={`/tickets/${ticket.id}`} className="block card p-4 hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">{ticket.ticketNumber}</div>
          <h3 className="mt-0.5 font-medium text-gray-900">{ticket.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{ticket.description}</p>
      <div className="mt-3 text-xs text-gray-500">
        <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
      </div>
    </Link>
  );
}
