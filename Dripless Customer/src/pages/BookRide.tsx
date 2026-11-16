import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { ROUTES } from '../utils/routes';

const BookRide = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/booking/taxi', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="text-xl font-semibold">Eco Ride</h1>
      </div>
      <div className="p-4 text-sm text-gray-600">
        Opening e-hailing for people…
      </div>
    </div>
  );
};

export default BookRide;
