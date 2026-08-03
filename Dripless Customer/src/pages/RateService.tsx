import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon, CheckCircleIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ImageUpload from '../components/ImageUpload';
import { useAnalytics } from '../hooks/useAnalytics';
const RateService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const serviceDetails = location.state?.service || {
    name: 'Car Wash',
    date: 'Today'
  };
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const tips = [2, 5, 10];
  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    trackEvent('Service Rated', {
      service: serviceDetails.name,
      rating,
      hasComment: !!comment,
      hasTip: !!tip,
      tipAmount: tip,
      imagesCount: images.length
    });
    toast.success('Thank you for your feedback!');
    navigate('/home');
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
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
          Rate Service
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Service Info */}
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-eco-100 dark:bg-eco-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircleIcon
              size={32}
              className="text-eco-600 dark:text-eco-400" />

          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
            Service Completed!
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            How was your {serviceDetails.name}?
          </p>
        </div>

        {/* Rating Stars */}
        <div className="glass-card p-6 flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((star) =>
          <motion.button
            key={star}
            whileTap={{
              scale: 0.8
            }}
            onClick={() => setRating(star)}
            className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-eco-500 rounded-full"
            aria-label={`Rate ${star} stars`}>

              <StarIcon
              size={40}
              className={`transition-colors ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />

            </motion.button>
          )}
        </div>

        {/* Comment */}
        <div className="glass-card p-5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
            Leave a comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 resize-none h-24 text-sm" />

        </div>

        {/* Image Upload */}
        <div className="glass-card p-5">
          <ImageUpload
            label="Add Photos (Optional)"
            maxImages={3}
            onImagesChange={setImages} />

        </div>

        {/* Tip */}
        <div className="glass-card p-5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1">
            Add a Tip
          </label>
          <div className="grid grid-cols-4 gap-3">
            {tips.map((amount) =>
            <button
              key={amount}
              onClick={() => setTip(tip === amount ? null : amount)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${tip === amount ? 'bg-eco-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>

                ${amount}
              </button>
            )}
            <button
              onClick={() => setTip(0)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${tip === 0 ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>

              No Tip
            </button>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{
            scale: 0.96
          }}
          onClick={handleSubmit}
          className="btn-primary w-full py-4 font-bold text-lg shadow-xl shadow-eco-500/20">

          Submit Review
        </motion.button>
      </div>
    </div>);

};
export default RateService;