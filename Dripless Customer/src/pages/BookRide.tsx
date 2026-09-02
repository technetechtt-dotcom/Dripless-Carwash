import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { ROUTES } from '../utils/routes';

const BookRide = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(ROUTES.SERVICES, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="text-xl font-semibold">Services</h1>
      </div>
      <div className="p-4 text-sm text-gray-600">
        Mobility services are not part of the current launch. Redirecting to available services…
      </div>
    </div>
  );
};

export default BookRide;
