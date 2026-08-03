import React, { useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  BugIcon,
  SendIcon,
  StarIcon,
  CheckCircleIcon,
  CameraIcon,
  XIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};
const item = {
  hidden: {
    opacity: 0,
    y: 16
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};
const Feedback = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feedback' | 'bug'>('feedback');
  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  // Bug report state
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSeverity, setBugSeverity] = useState<
    'low' | 'medium' | 'high' | ''>(
    '');
  const [bugSteps, setBugSteps] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const feedbackCategories = [
  'App Experience',
  'Service Quality',
  'Payment',
  'Customer Support',
  'Feature Request',
  'Other'];

  const handleSubmitFeedback = () => {
    if (!feedbackRating) {
      toast.error('Please select a rating');
      return;
    }
    if (!feedbackMessage.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setFeedbackRating(0);
      setFeedbackCategory('');
      setFeedbackMessage('');
    }, 2500);
  };
  const handleSubmitBug = () => {
    if (!bugTitle.trim()) {
      toast.error('Please enter a bug title');
      return;
    }
    if (!bugDescription.trim()) {
      toast.error('Please describe the bug');
      return;
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setBugTitle('');
      setBugDescription('');
      setBugSeverity('');
      setBugSteps('');
    }, 2500);
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full glass">

          <ArrowLeftIcon
            size={20}
            className="text-slate-700 dark:text-slate-200" />

        </motion.button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Feedback
        </h1>
      </div>

      <div className="p-4 space-y-5">
        {/* Tabs */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">

          <button
            className={`py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'feedback' ? 'bg-white dark:bg-slate-700 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setActiveTab('feedback')}>

            <MessageSquareIcon size={16} />
            Send Feedback
          </button>
          <button
            className={`py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'bug' ? 'bg-white dark:bg-slate-700 text-red-500 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setActiveTab('bug')}>

            <BugIcon size={16} />
            Report a Bug
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'feedback' ?
          <motion.div
            key="feedback"
            initial={{
              opacity: 0,
              x: -20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: 20
            }}
            className="space-y-5">

              {/* Rating */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  How's your experience?
                </h3>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) =>
                <motion.button
                  key={star}
                  whileTap={{
                    scale: 0.8
                  }}
                  onClick={() => setFeedbackRating(star)}
                  className="p-1">

                      <StarIcon
                    size={36}
                    className={`transition-colors ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />

                    </motion.button>
                )}
                </div>
                {feedbackRating > 0 &&
              <motion.p
                initial={{
                  opacity: 0
                }}
                animate={{
                  opacity: 1
                }}
                className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">

                    {feedbackRating <= 2 ?
                "We're sorry to hear that" :
                feedbackRating <= 3 ?
                'Thanks for the feedback' :
                feedbackRating === 4 ?
                'Great to hear!' :
                'Awesome! 🎉'}
                  </motion.p>
              }
              </div>

              {/* Category */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {feedbackCategories.map((cat) =>
                <button
                  key={cat}
                  onClick={() => setFeedbackCategory(cat)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${feedbackCategory === cat ? 'bg-eco-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>

                      {cat}
                    </button>
                )}
                </div>
              </div>

              {/* Message */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Your Feedback
                </h3>
                <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 resize-none h-32 text-sm" />

              </div>

              {/* Submit */}
              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={handleSubmitFeedback}
              className="btn-primary w-full py-4 font-bold flex items-center justify-center gap-2">

                <SendIcon size={18} />
                Submit Feedback
              </motion.button>
            </motion.div> :

          <motion.div
            key="bug"
            initial={{
              opacity: 0,
              x: 20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: -20
            }}
            className="space-y-5">

              {/* Bug Title */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Bug Title
                </h3>
                <input
                type="text"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 text-sm" />

              </div>

              {/* Severity */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Severity
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) =>
                <button
                  key={level}
                  onClick={() => setBugSeverity(level)}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${bugSeverity === level ? level === 'low' ? 'bg-blue-500 text-white' : level === 'medium' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>

                      {level}
                    </button>
                )}
                </div>
              </div>

              {/* Description */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Description
                </h3>
                <textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 resize-none h-28 text-sm" />

              </div>

              {/* Steps to Reproduce */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">
                  Steps to Reproduce
                </h3>
                <textarea
                value={bugSteps}
                onChange={(e) => setBugSteps(e.target.value)}
                placeholder="1. Go to...&#10;2. Tap on...&#10;3. See error..."
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 resize-none h-28 text-sm" />

              </div>

              {/* Screenshot hint */}
              <div className="glass-card p-4 flex items-center border-l-4 border-l-amber-500">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg mr-3">
                  <CameraIcon
                  size={16}
                  className="text-amber-600 dark:text-amber-400" />

                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Tip: Take a screenshot of the issue before reporting for
                  faster resolution.
                </p>
              </div>

              {/* Submit */}
              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={handleSubmitBug}
              className="w-full py-4 font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 rounded-xl">

                <BugIcon size={18} />
                Submit Bug Report
              </motion.button>
            </motion.div>
          }
        </AnimatePresence>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess &&
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">

            <motion.div
            initial={{
              scale: 0.5,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.5,
              opacity: 0
            }}
            transition={{
              type: 'spring',
              damping: 20
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-2xl mx-6">

              <motion.div
              initial={{
                scale: 0
              }}
              animate={{
                scale: 1
              }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200
              }}
              className="bg-eco-100 dark:bg-eco-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">

                <CheckCircleIcon size={32} className="text-eco-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {activeTab === 'feedback' ? 'Thank You!' : 'Bug Reported!'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activeTab === 'feedback' ?
              'Your feedback helps us improve Dripless.' :
              'Our team will investigate this issue.'}
              </p>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default Feedback;