import React, { useState } from 'react';
import { TrophyIcon, UsersIcon, ClockIcon, CheckCircleIcon } from 'lucide-react';
const EcoChallenges = () => {
  const [joinedChallenges, setJoinedChallenges] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);
  const challenges = [
  {
    id: 1,
    title: 'Community Water Save',
    goal: '10,000L',
    current: 7234,
    target: 10000,
    participants: 156,
    daysLeft: 5,
    color: 'blue'
  },
  {
    id: 2,
    title: 'Zero Emission Week',
    goal: '50 eco-rides',
    current: 38,
    target: 50,
    participants: 89,
    daysLeft: 2,
    color: 'green'
  },
  {
    id: 3,
    title: 'Clean Energy Month',
    goal: '200 solar cleans',
    current: 67,
    target: 200,
    participants: 234,
    daysLeft: 18,
    color: 'amber'
  }];

  const handleJoin = (id: number) => {
    if (joinedChallenges.includes(id)) return;
    setJoinedChallenges([...joinedChallenges, id]);
  };
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">
          Community Challenges
        </h3>
        <button
          type="button"
          className="text-eco-600 dark:text-eco-400 text-sm font-bold"
          onClick={() => setShowAll((prev) => !prev)}>
          {showAll ? 'Show Less' : 'View All'}
        </button>
      </div>

      <div className="space-y-4">
        {(showAll ? challenges : challenges.slice(0, 2)).map((challenge) => {
          const percentage = Math.min(
            100,
            challenge.current / challenge.target * 100
          );
          const isJoined = joinedChallenges.includes(challenge.id);
          return (
            <div key={challenge.id} className="glass p-5 dark:bg-slate-800/80">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">
                  {challenge.title}
                </h4>
                <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                  <ClockIcon size={12} className="mr-1.5" />
                  {challenge.daysLeft}d left
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>
                    {challenge.current.toLocaleString()} / {challenge.goal}
                  </span>
                  <span>{Math.round(percentage)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-${challenge.color}-500 transition-all duration-1000 ease-out`}
                    style={{
                      width: `${percentage}%`
                    }}>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) =>
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-white bg-${['teal', 'purple', 'orange'][i]}-400 shadow-sm`}>

                      {String.fromCharCode(65 + i)}
                    </div>
                  )}
                  <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-300">
                    +{challenge.participants - 3}
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(challenge.id)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 ${isJoined ? 'bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 cursor-default' : 'btn-primary'}`}>

                  {isJoined ?
                  <span className="flex items-center">
                      <CheckCircleIcon size={14} className="mr-1.5" /> Joined
                    </span> :

                  'Join Challenge'
                  }
                </button>
              </div>
            </div>);

        })}
      </div>
    </div>);

};
export default EcoChallenges;