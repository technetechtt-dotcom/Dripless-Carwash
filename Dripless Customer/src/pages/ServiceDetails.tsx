import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  CheckCircleIcon,
  LeafIcon,
  DownloadIcon,
  ShareIcon,
  MessageCircleIcon,
  StarIcon } from
'lucide-react';
import { formatCurrency, formatPoints } from '../utils/currency';
import { ROUTES } from '../utils/routes';
const ServiceDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const serviceData = location.state?.service;
  if (!serviceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-800">Service details unavailable</h1>
          <p className="text-sm text-gray-600 mt-2">
            Open this page from your booking history to view a real service record.
          </p>
          <button
            onClick={() => navigate(ROUTES.SERVICE_HISTORY)}
            className="mt-4 w-full bg-teal-500 text-white py-3 rounded-lg font-medium">
            Go to Service History
          </button>
        </div>
      </div>
    );
  }
  const service = {
    id: serviceData.id,
    type: serviceData.type,
    title: serviceData.title,
    date: serviceData.date,
    location: serviceData.location,
    price: serviceData.price,
    status: serviceData.status,
    ecoPoints: serviceData.ecoPoints,
    paymentMethod: 'Visa •••• 4242',
    bookingId: 'ECO-2024-001234',
    duration: '45 minutes',
    provider: {
      name: 'EcoClean Pro',
      rating: 4.8,
      completedServices: 1247
    },
    serviceDetails: {
      package: 'Premium Wash & Detail',
      includes: [
      'Waterless exterior wash',
      'Interior vacuum & wipe down',
      'Dashboard & console cleaning',
      'Window cleaning (inside & out)',
      'Tire shine application']

    },
    ecoImpact: {
      waterSaved: '150 liters',
      co2Reduced: '2.5 kg',
      chemicalsFree: true
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const handleShare = async () => {
    const text = `${service.title} on ${service.date} at ${service.location} (${service.bookingId})`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Dripless Service Details',
          text
        });
        return;
      } catch {
        // fallback below
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      window.alert('Service details copied to clipboard.');
      return;
    }
    window.alert(text);
  };
  const handleDownloadReceipt = () => {
    const receipt = [
      'Dripless Receipt',
      `Booking ID: ${service.bookingId}`,
      `Service: ${service.title}`,
      `Date: ${service.date}`,
      `Location: ${service.location}`,
      `Amount: ${formatCurrency(service.price)}`,
      `EcoPoints: ${formatPoints(service.ecoPoints)}`
    ].join('\n');
    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${service.bookingId}-receipt.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-8 px-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeftIcon size={24} />
            </button>
            <h1 className="text-2xl font-bold">Service Details</h1>
          </div>
          <button className="p-2" onClick={() => void handleShare()}>
            <ShareIcon size={20} />
          </button>
        </div>

        {/* Booking ID */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
          <p className="text-xs text-white/80 mb-1">Booking ID</p>
          <p className="font-mono font-semibold">{service.bookingId}</p>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {service.title}
              </h2>
              <p className="text-sm text-gray-500">{service.date}</p>
            </div>
            <span
              className={`${getStatusColor(service.status)} text-xs px-3 py-1.5 rounded-full font-medium`}>

              {service.status === 'completed' &&
              <span className="flex items-center">
                  <CheckCircleIcon size={14} className="mr-1" />
                  Completed
                </span>
              }
            </span>
          </div>

          {/* Price & Points */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(service.price)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">EcoPoints Earned</p>
              <p className="text-2xl font-bold text-teal-600">
                +{formatPoints(service.ecoPoints)}
              </p>
            </div>
          </div>
        </div>

        {/* Service Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-4">Service Information</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <MapPinIcon size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium text-gray-800">{service.location}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <CalendarIcon size={18} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Date & Time</p>
                <p className="font-medium text-gray-800">{service.date}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-amber-100 p-2 rounded-lg mr-3">
                <ClockIcon size={18} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-medium text-gray-800">{service.duration}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <CreditCardIcon size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-800">
                  {service.paymentMethod}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Package Details */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-3">Package Details</h3>
          <div className="bg-teal-50 rounded-lg p-3 mb-3">
            <p className="font-medium text-teal-900">
              {service.serviceDetails.package}
            </p>
          </div>
          <div className="space-y-2">
            {service.serviceDetails.includes.map((item, index) =>
            <div key={index} className="flex items-start">
                <CheckCircleIcon
                size={16}
                className="text-teal-600 mr-2 mt-0.5 flex-shrink-0" />

                <p className="text-sm text-gray-700">{item}</p>
              </div>
            )}
          </div>
        </div>

        {/* Eco Impact */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl shadow-sm p-4 mb-4 border border-green-100">
          <div className="flex items-center mb-3">
            <LeafIcon size={20} className="text-green-600 mr-2" />
            <h3 className="font-semibold text-green-900">
              Your Environmental Impact
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold text-green-700">
                {service.ecoImpact.waterSaved}
              </p>
              <p className="text-xs text-gray-600">Water Saved</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold text-green-700">
                {service.ecoImpact.co2Reduced}
              </p>
              <p className="text-xs text-gray-600">CO₂ Reduced</p>
            </div>
          </div>
          {service.ecoImpact.chemicalsFree &&
          <div className="mt-3 flex items-center text-sm text-green-800">
              <CheckCircleIcon size={16} className="mr-2" />
              <span>100% chemical-free products used</span>
            </div>
          }
        </div>

        {/* Service Provider */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-3">Service Provider</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-teal-100 p-3 rounded-full mr-3">
                <span className="text-lg font-bold text-teal-600">
                  {service.provider.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {service.provider.name}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <StarIcon size={12} className="text-amber-500 mr-1" />
                  <span className="font-medium text-gray-700">
                    {service.provider.rating}
                  </span>
                  <span className="mx-1">•</span>
                  <span>{service.provider.completedServices} services</span>
                </div>
              </div>
            </div>
            <button
              className="p-2 bg-gray-100 rounded-lg"
              onClick={() => navigate(ROUTES.HELP_SUPPORT)}>
              <MessageCircleIcon size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <button
            className="w-full bg-white border border-gray-300 text-gray-700 py-4 rounded-lg font-medium flex items-center justify-center"
            onClick={handleDownloadReceipt}>
            <DownloadIcon size={18} className="mr-2" />
            Download Receipt
          </button>

          <button
            onClick={() => navigate(ROUTES.BOOK_SERVICE(service.type))}
            className="w-full bg-teal-500 text-white py-4 rounded-lg font-medium">

            Book Again
          </button>

          {service.status === 'completed' &&
          <button
            className="w-full bg-white border border-teal-500 text-teal-600 py-4 rounded-lg font-medium"
            onClick={() => navigate(ROUTES.RATE_SERVICE, { state: { service } })}>
              Rate This Service
            </button>
          }
        </div>
      </div>
    </div>);

};
export default ServiceDetails;