import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CarIcon, PackageIcon } from 'lucide-react';
const BookRide = () => {
  const navigate = useNavigate();
  const services = [
  {
    id: 'taxi',
    title: 'Eco Taxi',
    description: 'Carbon-neutral rides with hybrid or electric vehicles',
    icon: <CarIcon size={24} className="text-white" />,
    color: 'bg-green-500',
    route: '/booking/taxi'
  },
  {
    id: 'delivery',
    title: 'Parcel Delivery',
    description: 'Eco-friendly delivery with optimized routes',
    icon: <PackageIcon size={24} className="text-white" />,
    color: 'bg-blue-500',
    route: '/booking/delivery'
  }];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="text-xl font-semibold">Book a Ride</h1>
      </div>
      <div className="p-4">
        <p className="text-gray-600 mb-6">
          Choose from our eco-friendly transportation options
        </p>
        <div className="space-y-4">
          {services.map((service) =>
          <div
            key={service.id}
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(service.route)}>

              <div className="flex items-start">
                <div className={`${service.color} p-4 rounded-lg mr-4`}>
                  {service.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>);

};
export default BookRide;