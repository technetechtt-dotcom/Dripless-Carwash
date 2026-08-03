import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CopyIcon,
  Share2Icon,
  GiftIcon,
  UsersIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAnalytics } from '../hooks/useAnalytics';
const Referrals = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const referralCode = 'ALEX2024';
  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
    trackEvent('Referral Code Copied');
  };
  const handleShare = async () => {
    const shareData = {
      title: 'Join Dripless Wash',
      text: `Use my code ${referralCode} to get $10 off your first eco-friendly car wash on Dripless Wash!`,
      url: 'https://dripless.app/invite/' + referralCode
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackEvent('Referral Shared', {
          method: 'native'
        });
      } else {
        handleCopy();
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
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
          Refer & Earn
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-br from-eco-500 to-teal-600 rounded-3xl p-8 text-center text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GiftIcon size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Give $10, Get $10</h2>
            <p className="text-eco-100 font-medium">
              Invite friends to Dripless Wash. They get $10 off their first
              wash, and you get $10 credit.
            </p>
          </div>
        </div>

        {/* Code Card */}
        <div className="glass-card p-6 text-center">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Your Referral Code
          </p>
          <div
            onClick={handleCopy}
            className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group">

            <span className="text-2xl font-mono font-bold text-slate-800 dark:text-white tracking-wider">
              {referralCode}
            </span>
            <CopyIcon
              size={20}
              className="text-slate-400 group-hover:text-eco-500 transition-colors" />

          </div>

          <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={handleShare}
            className="btn-primary w-full py-4 mt-4 font-bold flex items-center justify-center gap-2">

            <Share2Icon size={18} />
            Share Link
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
              <UsersIcon size={16} />
              <span className="text-xs font-bold uppercase">
                Friends Invited
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              12
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
              <GiftIcon size={16} />
              <span className="text-xs font-bold uppercase">Earned</span>
            </div>
            <p className="text-2xl font-bold text-eco-600 dark:text-eco-400">
              $40
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">
            How it works
          </h3>
          <div className="space-y-6 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700 -z-10" />

            {[
            {
              title: 'Invite Friends',
              desc: 'Share your unique link via text, email or social.'
            },
            {
              title: 'They Book',
              desc: 'Friends get $10 off their first eco-friendly service.'
            },
            {
              title: 'You Earn',
              desc: 'Get $10 credit automatically after their service completes.'
            }].
            map((step, i) =>
            <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-eco-100 dark:bg-eco-900/30 flex items-center justify-center text-eco-600 dark:text-eco-400 font-bold text-sm flex-shrink-0 border-4 border-white dark:border-slate-800">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);

};
export default Referrals;