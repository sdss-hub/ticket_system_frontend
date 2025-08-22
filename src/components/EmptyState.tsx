export default function EmptyState({
  title = 'Nothing here yet',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="w-full rounded-md border border-gray-200 bg-white px-4 py-6 text-center">
      <div className="text-sm font-medium text-gray-900">{title}</div>
      {description && <div className="mt-1 text-sm text-gray-600">{description}</div>}
    </div>
  );
}
