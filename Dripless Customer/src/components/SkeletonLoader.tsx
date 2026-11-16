import React from 'react';
export const CardSkeleton = () =>
<div className="glass-card p-4 h-32 w-full animate-pulse flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
    </div>
    <div className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>;

export const ListSkeleton = () =>
<div className="space-y-3">
    {[1, 2, 3, 4].map((i) =>
  <div key={i} className="glass-card p-4 flex items-center animate-pulse">
        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 mr-4" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
  )}
  </div>;

export const ProfileSkeleton = () =>
<div className="animate-pulse space-y-6">
    <div className="flex items-center space-x-4">
      <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3 flex-1">
        <div className="h-6 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) =>
    <div
      key={i}
      className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />

    )}
    </div>
  </div>;

export const PageSkeleton = () =>
<div className="min-h-screen p-4 space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center mb-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
    </div>

    {/* Hero Card */}
    <div className="h-40 w-full rounded-3xl bg-slate-200 dark:bg-slate-700 mb-8" />

    {/* Grid */}
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>

    {/* List */}
    <div className="space-y-4">
      <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
      <div className="h-20 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-20 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-20 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>;