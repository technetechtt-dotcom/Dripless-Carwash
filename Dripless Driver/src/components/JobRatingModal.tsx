import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { Job } from '../types';
import { GlassButton } from './ui/GlassButton';
import { GlassCard } from './ui/GlassCard';
import { useToast } from '../contexts/ToastContext';
interface JobRatingModalProps {
  isOpen: boolean;
  job: Job | null;
  onClose: () => void;
  onSubmitRating: (rating: number, feedback?: string) => void;
}
export function JobRatingModal({
  isOpen,
  job,
  onClose,
  onSubmitRating
}: JobRatingModalProps) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const { showToast } = useToast();
  const handleSubmit = () => {
    onSubmitRating(rating, feedback);
    showToast('Rating submitted successfully!', 'success');
    onClose();
    // Reset state after closing animation
    setTimeout(() => {
      setRating(5);
      setFeedback('');
    }, 300);
  };
  if (!job) return null;
  return (
    <AnimatePresence>
      {isOpen &&
      <>
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={onClose}
          aria-hidden="true" />


          <motion.div
          initial={{
            y: '100%'
          }}
          animate={{
            y: 0
          }}
          exit={{
            y: '100%'
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300
          }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rating-modal-title">

            <GlassCard elevated className="p-6 max-w-md mx-auto relative">
              <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Close">

                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <h3
                id="rating-modal-title"
                className="text-2xl font-bold text-slate-900 dark:text-white mb-2">

                  How was your job?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Rate your experience with {job.customerName}
                </p>
              </div>

              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5].map((i) =>
              <button
                key={i}
                onClick={() => setRating(i)}
                className="focus:outline-none transition-transform active:scale-90"
                aria-label={`Rate ${i} stars`}>

                    <Star
                  size={36}
                  className={`transition-colors ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />

                  </button>
              )}
              </div>

              <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Any feedback? (optional)"
              className="w-full h-24 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none" />


              <GlassButton
              onClick={handleSubmit}
              className="w-full py-3.5 text-lg">

                Submit Rating
              </GlassButton>
            </GlassCard>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}