export default function Home() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">Welcome</h2>
        <p className="mt-2 text-sm text-gray-600">
          You are signed in. This is the home page placeholder for your Ticket System.
        </p>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">Next steps</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Create ticket list and details pages</li>
          <li>Hook up real authentication API</li>
          <li>Add global theming and dark mode</li>
        </ul>
      </section>
    </div>
  );
}
