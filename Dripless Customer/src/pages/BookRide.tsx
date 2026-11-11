import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BookRide = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/booking/taxi', { replace: true });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">Opening ride booking…</p>
    </main>
  );
};

export default BookRide;
