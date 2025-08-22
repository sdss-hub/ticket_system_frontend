import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketsApi } from '../api/tickets';
import { useAuth } from '../state/AuthContext';
import { CategoriesApi } from '../api/categories';
import { Priority, type CategoryDto } from '../api/types';
import { useEffect } from 'react';

export default function TicketNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  useEffect(() => {
    CategoriesApi.list()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!user) throw new Error('You must be signed in');
      const created = await TicketsApi.create({
        title: title.trim(),
        description: description.trim(),
        customerId: user.id,
        categoryId: categoryId === '' ? undefined : (categoryId as number),
        priority: priority === '' ? undefined : (priority as Priority),
        dueDate: dueDate || undefined,
      });
      // Stub: files upload not implemented yet
      if (files && files.length > 0) {
        console.info(
          'File upload stub - selected files:',
          Array.from(files).map((f) => f.name),
        );
      }
      navigate(`/tickets/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">Create Ticket</h1>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="input mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className="input mt-1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              className="input mt-1"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value === '' ? '' : (Number(e.target.value) as Priority))
              }
            >
              <option value="">Normal</option>
              <option value={Priority.Low}>Low</option>
              <option value={Priority.Medium}>Medium</option>
              <option value={Priority.High}>High</option>
              <option value={Priority.Critical}>Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Due date</label>
            <input
              type="date"
              className="input mt-1"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Attachments</label>
          <input className="mt-1" type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          <p className="mt-1 text-xs text-gray-500">Upload stub only; files are not sent yet.</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
