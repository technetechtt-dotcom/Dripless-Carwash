import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LeafIcon,
  TreesIcon,
  GiftIcon,
  TrophyIcon,
  Share2Icon } from
'lucide-react';
import EcoChart from '../components/EcoChart';
import EcoChallenges from '../components/EcoChallenges';
import EcoLeaderboard from '../components/EcoLeaderboard';
import { ROUTES } from '../utils/routes';

const Rewards = () => {
  const navigate = useNavigate();
  const [points, setPoints] = useState(1250);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState('');

  const shareImpact = async () => {
    const text = `I have ${points} EcoPoints on Dripless and I'm Level 3: Eco Enthusiast!`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'My Dripless Eco Impact', text });
        return;
      } catch {
        // fall through
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setRedeemFeedback('Impact summary copied to clipboard.');
      return;
    }
    window.alert(text);
  };

  const redeemReward = (cost: number, label: string) => {
    if (points < cost) {
      setRedeemFeedback(`Need ${cost - points} more points for ${label}.`);
      return;
    }
    setPoints((prev) => prev - cost);
    setRedeemFeedback(`Redeemed ${label}. ${cost} points deducted.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">EcoPoints</h1>
        <p className="text-gray-500 text-sm">
          Earn rewards for sustainable choices
        </p>
      </div>

      {/* Points Overview */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-xl p-6 text-white text-center mb-6 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-lg font-medium mb-1">Your EcoPoints</h2>
          <div className="text-4xl font-bold mb-2">{points.toLocaleString()}</div>
          <div className="text-sm opacity-90 mb-4">Level 3: Eco Enthusiast</div>

          <div className="mt-4">
            <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: '65%'
                }}>
              </div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>0</span>
              <span>Next level: 1,500 pts</span>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center justify-center mx-auto bg-white/20 hover:bg-white/30 transition-colors rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
            onClick={() => void shareImpact()}>
            <Share2Icon size={12} className="mr-1.5" /> Share Impact
          </button>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full"></div>
      </div>

      {redeemFeedback ? (
        <p className="mb-4 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
          {redeemFeedback}
        </p>
      ) : null}

      {/* Interactive Chart */}
      <EcoChart />

      {/* Leaderboard */}
      <EcoLeaderboard />

      {/* Challenges */}
      <EcoChallenges />

      {/* Achievements */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Achievements</h3>
          <button
            type="button"
            className="text-teal-500 text-sm font-medium"
            onClick={() => setShowAllAchievements((prev) => !prev)}>
            {showAllAchievements ? 'Show Less' : 'View All'}
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center mb-4">
            <div className="bg-amber-100 p-3 rounded-full mr-4">
              <TrophyIcon size={20} className="text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium">First Time User</h4>
              <p className="text-xs text-gray-500">
                Completed your first eco-service
              </p>
            </div>
            <div className="ml-auto text-xs font-medium text-teal-500">
              +50 pts
            </div>
          </div>
          <div className="flex items-center mb-4">
            <div className="bg-teal-100 p-3 rounded-full mr-4">
              <LeafIcon size={20} className="text-teal-600" />
            </div>
            <div>
              <h4 className="font-medium">Water Saver</h4>
              <p className="text-xs text-gray-500">
                Used waterless car wash 3 times
              </p>
            </div>
            <div className="ml-auto text-xs font-medium text-teal-500">
              +100 pts
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-gray-100 p-3 rounded-full mr-4">
              <GiftIcon size={20} className="text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-400">Referral Champion</h4>
              <p className="text-xs text-gray-400">Invite 3 friends to join</p>
              <div className="h-1.5 w-24 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{
                    width: '33%'
                  }}>
                </div>
              </div>
            </div>
            <div className="ml-auto text-xs font-medium text-gray-400">
              +200 pts
            </div>
          </div>
          {showAllAchievements ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                className="w-full text-sm font-medium text-teal-600"
                onClick={() => navigate(ROUTES.REFERRALS)}>
                Invite friends to unlock Referral Champion
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Rewards */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Redeem Rewards</h3>
          <button
            type="button"
            className="text-teal-500 text-sm font-medium"
            onClick={() => setShowAllRewards((prev) => !prev)}>
            {showAllRewards ? 'Show Less' : 'View All'}
          </button>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-3">
                <GiftIcon size={18} className="text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">$5 Service Credit</h4>
                <p className="text-xs text-gray-500">
                  Use on your next booking
                </p>
              </div>
            </div>
            <button
              type="button"
              className="bg-teal-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              onClick={() => redeemReward(500, '$5 Service Credit')}>
              500 pts
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-3">
                <TreesIcon size={18} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Plant a Tree</h4>
                <p className="text-xs text-gray-500">
                  We'll plant a tree in your name
                </p>
              </div>
            </div>
            <button
              type="button"
              className="bg-teal-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              onClick={() => redeemReward(750, 'Plant a Tree')}>
              750 pts
            </button>
          </div>
          {(showAllRewards || points >= 2000) ? (
            <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-3">
                  <TrophyIcon size={18} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Premium Membership</h4>
                  <p className="text-xs text-gray-500">
                    1 month of special perks
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="bg-teal-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                onClick={() => redeemReward(2000, 'Premium Membership')}>
                2000 pts
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center opacity-60">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-3">
                  <TrophyIcon size={18} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Premium Membership</h4>
                  <p className="text-xs text-gray-500">
                    1 month of special perks
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="bg-gray-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                onClick={() => redeemReward(2000, 'Premium Membership')}>
                2000 pts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Rewards;
