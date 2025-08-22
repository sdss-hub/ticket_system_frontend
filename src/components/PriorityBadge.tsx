import { Priority } from '../api/types';

const styles: Record<Priority, string> = {
  [Priority.Low]: 'bg-green-50 text-green-700 ring-green-600/20',
  [Priority.Medium]: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  [Priority.High]: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  [Priority.Critical]: 'bg-red-50 text-red-700 ring-red-600/20',
};

const labels: Record<Priority, string> = {
  [Priority.Low]: 'Low',
  [Priority.Medium]: 'Medium',
  [Priority.High]: 'High',
  [Priority.Critical]: 'Critical',
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}
