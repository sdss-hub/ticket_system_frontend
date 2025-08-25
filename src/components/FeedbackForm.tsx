import { useState } from 'react';
import { FeedbackApi } from '../api/feedback';
import { useAuth } from '../state/AuthContext';

interface FeedbackFormProps {
  ticketId: number;
  onSubmitted: () => void;
}

export default function FeedbackForm({ ticketId, onSubmitted }: FeedbackFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      await FeedbackApi.create({
        ticketId,
        customerId: user.id,
        rating,
        comment: comment.trim(),
      });
      onSubmitted();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How would you rate your experience? *
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {rating === 0 ? 'Click to rate' : 
             rating === 1 ? 'Poor' :
             rating === 2 ? 'Fair' :
             rating === 3 ? 'Good' :
             rating === 4 ? 'Very Good' : 'Excellent'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Comments
        </label>
        <textarea
          className="input w-full"
          rows={4}
          placeholder="Tell us about your experience with the support..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || rating === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
        <span className="text-xs text-gray-500">
          * Rating is required
        </span>
      </div>
    </form>
  );
}
