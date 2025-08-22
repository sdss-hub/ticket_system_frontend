import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { TicketsApi } from '../api/tickets';
import type { TicketResponseDto, UserDto } from '../api/types';
import { TicketStatus, UserRole } from '../api/types';
import { useAuth } from '../state/AuthContext';
import { UsersApi } from '../api/users';
import { AiApi, type TicketInsightDto } from '../api/ai';
import { AttachmentsApi } from '../api/attachments';

export default function TicketDetail() {
  const { id } = useParams();
  const ticketId = useMemo(() => Number(id), [id]);
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [agents, setAgents] = useState<UserDto[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [insights, setInsights] = useState<TicketInsightDto[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await TicketsApi.getById(ticketId);
      setTicket(t);
    } catch (e: any) {
      setError(e?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(ticketId)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    UsersApi.list(UserRole.Agent)
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);

  const loadInsights = async () => {
    if (!Number.isFinite(ticketId)) return;
    try {
      const list = await AiApi.insights(ticketId);
      setInsights(list);
    } catch {
      setInsights([]);
    }
  };

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const onAddComment = async () => {
    if (!ticket || !comment.trim() || !user) return;
    setAddingComment(true);
    try {
      await TicketsApi.addComment(
        ticket.id,
        { commentText: comment.trim(), isInternal: false },
        user.id,
      );
      setComment('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const onUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticket || !user) return;
    setUpdatingStatus(true);
    try {
      await TicketsApi.updateStatus(ticket.id, newStatus, user.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onAssign = async (agentId: number) => {
    if (!ticket || !user) return;
    setAssigning(true);
    try {
      await TicketsApi.assign(ticket.id, agentId, user.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to assign agent');
    } finally {
      setAssigning(false);
    }
  };

  const onSuggest = async () => {
    if (!ticket) return;
    try {
      const suggestion = await TicketsApi.suggestAgent(ticket.id);
      if (suggestion?.id) {
        await onAssign(suggestion.id);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to suggest agent');
    }
  };

  const onAnalyze = async () => {
    if (!Number.isFinite(ticketId)) return;
    setAnalyzing(true);
    try {
      await AiApi.analyzeTicket(ticketId);
      await loadInsights();
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze ticket');
    } finally {
      setAnalyzing(false);
    }
  };

  const onUpload = async () => {
    if (!ticket || !user || !fileToUpload) return;
    setUploading(true);
    try {
      await AttachmentsApi.upload(ticket.id, fileToUpload, user.id);
      setFileToUpload(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const onDeleteAttachment = async (attachmentId: number) => {
    if (!user) return;
    try {
      await AttachmentsApi.delete(attachmentId, user.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete attachment');
    }
  };

  if (!Number.isFinite(ticketId)) {
    return <ErrorState message="Invalid ticket id" />;
  }

  if (loading) return <Loading label="Loading ticket..." />;
  if (error) return <ErrorState message={error} />;
  if (!ticket) return <ErrorState message="Ticket not found" />;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">{ticket.title}</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">{ticket.ticketNumber}</div>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">{ticket.description}</p>
          </section>
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
              <button className="btn-primary" onClick={onAnalyze} disabled={analyzing}>
                {analyzing ? 'Analyzing…' : 'Re-analyze'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {insights.length === 0 ? (
                <div className="text-sm text-gray-600">No insights yet.</div>
              ) : (
                insights.map((i) => (
                  <div key={i.id} className="rounded-md border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>{i.insightType}</span>
                      <span>Conf: {(i.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <pre className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                      {i.data}
                    </pre>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(i.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            <div className="mt-3 space-y-3">
              {ticket.comments.length === 0 ? (
                <div className="text-sm text-gray-600">No comments yet.</div>
              ) : (
                ticket.comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">
                      {c.user.fullName || c.user.email} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm text-gray-800">{c.commentText}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-start gap-2">
              <textarea
                className="input flex-1"
                rows={3}
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="btn-primary"
                disabled={addingComment || !comment.trim()}
                onClick={onAddComment}
              >
                {addingComment ? 'Posting…' : 'Post'}
              </button>
            </div>
          </section>
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
                />
                <button className="btn-primary" onClick={onUpload} disabled={uploading || !fileToUpload}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {ticket.attachments.length === 0 ? (
                <div className="text-sm text-gray-600">No attachments.</div>
              ) : (
                ticket.attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm">
                    <div>
                      <div className="font-medium">{a.originalFileName || a.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleString()} · {a.mimeType}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a className="btn-secondary" href={AttachmentsApi.downloadUrl(a.id)}>
                        Download
                      </a>
                      {user && (
                        <button className="btn-danger" onClick={() => onDeleteAttachment(a.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900">Status</h3>
            <select
              className="input mt-2"
              value={ticket.status}
              onChange={(e) => onUpdateStatus(Number(e.target.value) as TicketStatus)}
              disabled={updatingStatus}
            >
              <option value={TicketStatus.New}>New</option>
              <option value={TicketStatus.InProgress}>In Progress</option>
              <option value={TicketStatus.Resolved}>Resolved</option>
              <option value={TicketStatus.Closed}>Closed</option>
            </select>
          </section>
          <section className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900">Assignment</h3>
            <div className="mt-2 text-sm text-gray-600">
              Current:{' '}
              {ticket.assignedAgent
                ? ticket.assignedAgent.fullName || ticket.assignedAgent.email
                : 'Unassigned'}
            </div>
            <select
              className="input mt-2"
              defaultValue=""
              onChange={(e) => e.target.value && onAssign(Number(e.target.value))}
              disabled={assigning}
            >
              <option value="" disabled>
                Assign to...
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName || a.email}
                </option>
              ))}
            </select>
            <button className="btn-primary mt-3" onClick={onSuggest} disabled={assigning}>
              Suggest with AI
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
