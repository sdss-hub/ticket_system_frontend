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
import FeedbackForm from '../components/FeedbackForm';

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

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!ticket) return <ErrorState message="Ticket not found" />;

  // Customer-specific view
  if (user?.role === UserRole.Customer) {
    return (
      <div className="space-y-6">
        <section className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>Ticket #{ticket.id}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                {ticket.dueDate && (
                  <span>Due {new Date(ticket.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-gray-700">{ticket.description}</div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            {ticket.assignedAgent ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Assigned to: <strong>{ticket.assignedAgent.fullName}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Waiting for agent assignment
              </span>
            )}
            {ticket.category && <span>Category: {ticket.category.name}</span>}
          </div>
        </section>

        {/* Customer Communication Section */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">💬 Communication</h2>
            {ticket.assignedAgent && (
              <span className="text-sm text-gray-600">
                with {ticket.assignedAgent.fullName}
              </span>
            )}
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {ticket.comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>No messages yet.</p>
                <p className="text-sm">Start a conversation with your support agent.</p>
              </div>
            ) : (
              ticket.comments.map((c) => (
                <div 
                  key={c.id} 
                  className={`flex ${c.user.id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      c.user.id === user.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{c.commentText}</div>
                    <div className={`text-xs mt-1 ${
                      c.user.id === user.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {c.user.fullName || c.user.email} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-end gap-2">
              <textarea
                className="input flex-1 resize-none"
                rows={2}
                placeholder={ticket.assignedAgent ? `Message ${ticket.assignedAgent.fullName}...` : "Message will be sent once agent is assigned..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={!ticket.assignedAgent}
              />
              <button
                className="btn-primary"
                disabled={addingComment || !comment.trim() || !ticket.assignedAgent}
                onClick={onAddComment}
              >
                {addingComment ? 'Sending…' : 'Send'}
              </button>
            </div>
            {!ticket.assignedAgent && (
              <p className="text-xs text-gray-500 mt-2">
                💡 An agent will be assigned to your ticket soon. You'll be able to communicate once assigned.
              </p>
            )}
          </div>
        </section>

        {/* Customer Attachments Section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📎 Attachments</h2>
          <div className="space-y-2">
            {ticket.attachments.length === 0 ? (
              <div className="text-sm text-gray-600">No attachments.</div>
            ) : (
              ticket.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm">
                  <div>
                    <div className="font-medium">{a.originalFileName || a.fileName}</div>
                    <div className="text-xs text-gray-500">
                      Uploaded by {a.uploadedBy?.fullName || 'Unknown'} · {new Date(a.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  <a
                    href={AttachmentsApi.downloadUrl(a.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
          
          {/* File Upload for Customer */}
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <button
                className="btn-secondary text-sm"
                disabled={uploading || !fileToUpload}
                onClick={onUpload}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload files to help your agent understand your issue better.
            </p>
          </div>
        </section>

        {/* Customer Feedback Form - Only show if ticket is resolved and no feedback yet */}
        {ticket.status === TicketStatus.Resolved && !ticket.feedback && (
          <section className="card p-6 bg-green-50 border-green-200">
            <h2 className="text-lg font-semibold text-green-900 mb-4">✅ Ticket Resolved - Please Provide Feedback</h2>
            <div className="text-sm text-green-700 mb-4">
              Your ticket has been resolved! Please rate your experience and provide feedback.
            </div>
            
            <FeedbackForm ticketId={ticket.id} onSubmitted={() => load()} />
          </section>
        )}

        {/* Show existing feedback if any */}
        {ticket.feedback && (
          <section className="card p-6 bg-gray-50 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Your Feedback</h2>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Rating & Comments</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= ticket.feedback!.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700">{ticket.feedback.comment}</p>
              <div className="text-xs text-gray-500 mt-2">
                Submitted on {new Date(ticket.feedback.createdAt).toLocaleDateString()}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Agent/Admin view
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>#{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
              {ticket.dueDate && (
                <span>Due {new Date(ticket.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          {/* Agent Status Management */}
          {user?.role === UserRole.Agent && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  className="input text-sm"
                  value={ticket.status}
                  onChange={(e) => onUpdateStatus(Number(e.target.value) as TicketStatus)}
                  disabled={updatingStatus}
                >
                  <option value={TicketStatus.New}>New</option>
                  <option value={TicketStatus.InProgress}>In Progress</option>
                  <option value={TicketStatus.Resolved}>Resolved</option>
                </select>
              </div>
              
              {/* Take/Release Assignment */}
              {!ticket.assignedAgent ? (
                <button
                  className="btn-primary text-sm"
                  onClick={() => onAssign(user.id)}
                  disabled={assigning}
                >
                  {assigning ? 'Taking...' : 'Take This Ticket'}
                </button>
              ) : ticket.assignedAgent.id === user.id ? (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Assigned to you
                </span>
              ) : (
                <span className="text-sm text-gray-600">
                  Assigned to {ticket.assignedAgent.fullName}
                </span>
              )}
            </div>
          )}
          
          {/* Admin Controls */}
          {user?.role === UserRole.Admin && (
            <div className="flex items-center gap-2">
              <select
                className="input text-sm"
                value={ticket.status}
                onChange={(e) => onUpdateStatus(Number(e.target.value) as TicketStatus)}
                disabled={updatingStatus}
              >
                <option value={TicketStatus.New}>New</option>
                <option value={TicketStatus.InProgress}>In Progress</option>
                <option value={TicketStatus.Resolved}>Resolved</option>
                <option value={TicketStatus.Closed}>Closed</option>
              </select>
              {ticket.assignedAgent ? (
                <span className="text-sm text-gray-600">
                  Assigned to {ticket.assignedAgent.fullName}
                </span>
              ) : (
                <select
                  className="input text-sm"
                  value=""
                  onChange={(e) => onAssign(Number(e.target.value))}
                  disabled={assigning}
                >
                  <option value="">Assign to agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-gray-700">{ticket.description}</div>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>Customer: {ticket.customer.fullName || ticket.customer.email}</span>
          {ticket.category && <span>Category: {ticket.category.name}</span>}
        </div>
      </section>

      {/* Customer Feedback Section - Only show if ticket is resolved */}
      {ticket.status === TicketStatus.Resolved && (
        <section className="card p-6 bg-green-50 border-green-200">
          <h2 className="text-lg font-semibold text-green-900 mb-4">✅ Ticket Resolved</h2>
          <div className="text-sm text-green-700 mb-4">
            This ticket has been marked as resolved. The customer can now provide feedback.
          </div>
          
          {/* Show existing feedback if any */}
          {ticket.feedback ? (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Customer Feedback</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= (ticket.feedback?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700">{ticket.feedback.comment}</p>
              <div className="text-xs text-gray-500 mt-2">
                Submitted on {new Date(ticket.feedback.createdAt).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 italic">
              Waiting for customer feedback...
            </div>
          )}
        </section>
      )}

      {/* Agent Communication Section */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💬 Communication with Customer</h2>
        
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {ticket.comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p>No messages yet.</p>
              <p className="text-sm">Start communicating with the customer.</p>
            </div>
          ) : (
            ticket.comments.map((c) => (
              <div 
                key={c.id} 
                className={`flex ${c.user.id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    c.user.id === user?.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm">{c.commentText}</div>
                  <div className={`text-xs mt-1 ${
                    c.user.id === user?.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {c.user.fullName || c.user.email} · {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex items-end gap-2">
            <textarea
              className="input flex-1 resize-none"
              rows={3}
              placeholder="Reply to customer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              className="btn-primary"
              disabled={addingComment || !comment.trim()}
              onClick={onAddComment}
            >
              {addingComment ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </section>

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
          {/* AI Analysis Panel - Only for Agents and Admins */}
          {user && (user.role === UserRole.Agent || user.role === UserRole.Admin) && (
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">🤖 AI Analysis</h2>
                <button 
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700" 
                  onClick={onAnalyze} 
                  disabled={analyzing}
                >
                  {analyzing ? 'Analyzing…' : 'Re-analyze'}
                </button>
              </div>
              
              {ticket.aiAnalysis ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Category & Confidence */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-blue-900">Category</h3>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                        {(ticket.aiAnalysis.categoryConfidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-blue-800 font-medium">{ticket.aiAnalysis.category}</p>
                  </div>
                  
                  {/* Priority */}
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-medium text-orange-900 mb-2">AI Suggested Priority</h3>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={ticket.aiAnalysis.priority} />
                      <span className="text-sm text-orange-700">
                        {ticket.priority === ticket.aiAnalysis.priority ? '✓ Matches current' : '⚠️ Different from current'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Sentiment */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-purple-900 mb-2">Customer Sentiment</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            ticket.aiAnalysis.sentiment > 0.7 ? 'bg-green-500' :
                            ticket.aiAnalysis.sentiment > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${ticket.aiAnalysis.sentiment * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-purple-700">
                        {ticket.aiAnalysis.sentiment > 0.7 ? 'Positive' :
                         ticket.aiAnalysis.sentiment > 0.4 ? 'Neutral' : 'Frustrated'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Keywords */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">Key Topics</h3>
                    <div className="flex flex-wrap gap-1">
                      {ticket.aiAnalysis.keywords?.slice(0, 6).map((keyword, idx) => (
                        <span key={idx} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-gray-400 text-4xl mb-2">🤖</div>
                  <p className="text-gray-600 mb-2">No AI analysis yet</p>
                  <p className="text-sm text-gray-500">Click "Re-analyze" to get AI insights about this ticket</p>
                </div>
              )}
              
              {/* Suggested Response */}
              {ticket.aiAnalysis?.suggestedResponse && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-yellow-900">💡 Suggested Response</h3>
                    <button 
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                      onClick={() => setComment(ticket.aiAnalysis?.suggestedResponse || '')}
                    >
                      Use Template
                    </button>
                  </div>
                  <p className="text-sm text-yellow-800 bg-yellow-100 p-3 rounded border">
                    {ticket.aiAnalysis.suggestedResponse}
                  </p>
                </div>
              )}
              
              {/* Customer History Insights */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">📊 Customer Insights</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Previous tickets:</span>
                    <span className="font-medium">3 tickets (2 resolved)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg resolution time:</span>
                    <span className="font-medium">1.2 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer since:</span>
                    <span className="font-medium">{new Date(ticket.customer.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Satisfaction score:</span>
                    <span className="font-medium text-green-600">4.2/5.0 ⭐</span>
                  </div>
                </div>
              </div>
            </section>
          )}
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
          {/* Business Impact - Only show for agents/admins */}
          {user && (user.role === UserRole.Agent || user.role === UserRole.Admin) && ticket.businessImpact && (
            <section className="card p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Impact</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Blocking Level:</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.businessImpact.blockingLevel === 4 ? 'bg-red-100 text-red-800' :
                      ticket.businessImpact.blockingLevel === 3 ? 'bg-orange-100 text-orange-800' :
                      ticket.businessImpact.blockingLevel === 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ticket.businessImpact.blockingLevel === 4 ? 'System Down' :
                       ticket.businessImpact.blockingLevel === 3 ? 'Completely Blocking' :
                       ticket.businessImpact.blockingLevel === 2 ? 'Partially Blocking' :
                       'Not Blocking'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Affected Users:</span>
                  <div className="mt-1">
                    <span className="font-medium">
                      {ticket.businessImpact.affectedUsers === 4 ? '🌐 Whole Company' :
                       ticket.businessImpact.affectedUsers === 3 ? '🏢 Department' :
                       ticket.businessImpact.affectedUsers === 2 ? '👥 Team' :
                       '👤 Individual'}
                    </span>
                  </div>
                </div>
                {ticket.businessImpact.urgentDeadline && (
                  <div>
                    <span className="text-gray-600">Urgent Deadline:</span>
                    <div className="mt-1 font-medium text-red-600">
                      {new Date(ticket.businessImpact.urgentDeadline).toLocaleString()}
                    </div>
                  </div>
                )}
                {ticket.businessImpact.additionalContext && (
                  <div>
                    <span className="text-gray-600">Additional Context:</span>
                    <div className="mt-1 text-gray-800 text-xs bg-gray-100 p-2 rounded">
                      {ticket.businessImpact.additionalContext}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
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
