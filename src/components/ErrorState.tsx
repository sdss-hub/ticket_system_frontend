export default function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return (
    <div className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
