import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketsApi } from '../api/tickets';
import { useAuth } from '../state/AuthContext';
import { CategoriesApi } from '../api/categories';
import { Priority, type CategoryDto, BlockingLevel, AffectedUsers, type BusinessImpactDto } from '../api/types';
import { useEffect } from 'react';
import { AiApi } from '../api/ai';
import { AttachmentsApi } from '../api/attachments';

export default function TicketNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [assisting, setAssisting] = useState(false);
  
  // Business Impact Questions
  const [blockingLevel, setBlockingLevel] = useState<BlockingLevel | ''>('');
  const [affectedUsers, setAffectedUsers] = useState<AffectedUsers | ''>('');
  const [urgentDeadline, setUrgentDeadline] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState<string>('');

  useEffect(() => {
    CategoriesApi.list()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const onAiAssist = async () => {
    if (!title.trim() || !description.trim()) return;
    setAssisting(true);
    setError(null);
    try {
      const res = await AiApi.categorize({ title: title.trim(), description: description.trim() });
      // Use the categoryId directly from the API response
      setCategoryId(res.categoryId);
      // AI suggestions will be handled by the backend based on business impact
    } catch (e: any) {
      setError(e?.message || 'AI assistance failed');
    } finally {
      setAssisting(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!user) throw new Error('You must be signed in');
      const businessImpact: BusinessImpactDto = {
        blockingLevel: blockingLevel as BlockingLevel,
        affectedUsers: affectedUsers as AffectedUsers,
        urgentDeadline: urgentDeadline || undefined,
        additionalContext: additionalContext || undefined,
      };
      
      const created = await TicketsApi.create({
        title: title.trim(),
        description: description.trim(),
        customerId: user.id,
        businessImpact,
        categoryId: categoryId === '' ? undefined : (categoryId as number),
      });
      // Upload attachments if any
      if (files && files.length > 0) {
        const toUpload = Array.from(files);
        for (const f of toUpload) {
          await AttachmentsApi.upload(created.id, f, user.id);
        }
      }
      navigate(`/tickets/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Create New Ticket</h1>
        <p className="mt-1 text-gray-600">Tell us about your issue and we'll prioritize it based on business impact</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Basic Information */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">What's the issue?</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Brief description of your problem</label>
            <input
              className="input mt-1"
              placeholder="e.g., Can't log into the system"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Detailed description</label>
            <textarea
              className="input mt-1"
              placeholder="Please provide as much detail as possible about the issue, including any error messages, steps you've tried, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
            />
            <div className="mt-2">
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                onClick={onAiAssist}
                disabled={assisting || !title.trim() || !description.trim()}
              >
                {assisting ? 'Analyzing…' : '🤖 Get AI suggestions for category'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Business Impact Assessment */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Business Impact Assessment</h2>
            <p className="text-sm text-gray-600">Help us understand the urgency so we can prioritize appropriately</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Is this blocking your work?</label>
            <div className="space-y-2">
              {[
                { value: BlockingLevel.NotBlocking, label: "Not blocking - I can work around it", color: "green" },
                { value: BlockingLevel.Partially, label: "Partially blocking - slowing me down", color: "yellow" },
                { value: BlockingLevel.Completely, label: "Completely blocking - can't work", color: "orange" },
                { value: BlockingLevel.SystemDown, label: "System is down - critical outage", color: "red" }
              ].map((option) => (
                <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="blockingLevel"
                    value={option.value}
                    checked={blockingLevel === option.value}
                    onChange={(e) => setBlockingLevel(Number(e.target.value) as BlockingLevel)}
                    className="mr-3"
                    required
                  />
                  <div className={`w-3 h-3 rounded-full bg-${option.color}-500 mr-3`}></div>
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How many people are affected?</label>
            <div className="space-y-2">
              {[
                { value: AffectedUsers.JustMe, label: "Just me", icon: "👤" },
                { value: AffectedUsers.MyTeam, label: "My team (2-10 people)", icon: "👥" },
                { value: AffectedUsers.Department, label: "My department (10+ people)", icon: "🏢" },
                { value: AffectedUsers.WholeCompany, label: "Whole company", icon: "🌐" }
              ].map((option) => (
                <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="affectedUsers"
                    value={option.value}
                    checked={affectedUsers === option.value}
                    onChange={(e) => setAffectedUsers(Number(e.target.value) as AffectedUsers)}
                    className="mr-3"
                    required
                  />
                  <span className="text-lg mr-3">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Do you have an urgent deadline?</label>
            <input
              type="datetime-local"
              className="input mt-1"
              value={urgentDeadline}
              onChange={(e) => setUrgentDeadline(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Optional - only if there's a specific deadline</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional context</label>
            <textarea
              className="input mt-1"
              placeholder="Any other information that might help us understand the impact..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        {/* Additional Details */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Additional Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Category (optional)</label>
            <select
              className="input mt-1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Let AI suggest the category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Our AI will suggest the best category based on your description</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Attachments</label>
            <input 
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
              type="file" 
              multiple 
              onChange={(e) => setFiles(e.target.files)} 
            />
            <p className="mt-1 text-xs text-gray-500">Screenshots, error logs, or other relevant files</p>
          </div>
        </div>
        
        {/* Priority Preview */}
        {blockingLevel && affectedUsers && (
          <div className="card p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="text-blue-600 mr-2">ℹ️</div>
              <div>
                <p className="text-sm font-medium text-blue-900">Estimated Priority</p>
                <p className="text-xs text-blue-700">
                  Based on your answers, this will likely be prioritized as {' '}
                  {blockingLevel >= BlockingLevel.SystemDown || affectedUsers >= AffectedUsers.WholeCompany ? 'Critical' :
                   blockingLevel >= BlockingLevel.Completely || affectedUsers >= AffectedUsers.Department ? 'High' :
                   blockingLevel >= BlockingLevel.Partially || affectedUsers >= AffectedUsers.MyTeam ? 'Medium' : 'Low'}
                  {urgentDeadline && ' with urgent deadline consideration'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Cancel
          </button>
          <button 
            type="submit" 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all transform hover:scale-105" 
            disabled={submitting || !blockingLevel || !affectedUsers}
          >
            {submitting ? 'Creating Ticket...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
