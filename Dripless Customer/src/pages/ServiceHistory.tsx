import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CarIcon,
  PackageIcon,
  SunIcon,
  HomeIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon } from
'lucide-react';
import { formatCurrency, formatPoints } from '../utils/currency';
import { ROUTES } from '../utils/routes';
const ServiceHistory = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const serviceHistory = [
  {
    id: 1,
    type: 'car-wash',
    title: 'Car Wash - Premium',
    date: 'Yesterday, 3:30 PM',
    location: '123 Main St, Downtown',
    price: 24.99,
    status: 'completed',
    ecoPoints: 250,
    icon: CarIcon,
    color: 'teal'
  },
  {
    id: 2,
    type: 'taxi',
    title: 'Eco Taxi',
    date: 'May 12, 10:15 AM',
    location: 'Airport to Home',
    price: 18.5,
    status: 'completed',
    ecoPoints: 185,
    icon: CarIcon,
    color: 'green'
  },
  {
    id: 3,
    type: 'window-solar-clean',
    title: 'Window Cleaning',
    date: 'May 5, 2:00 PM',
    location: '456 Oak Avenue',
    price: 39.99,
    status: 'completed',
    ecoPoints: 400,
    icon: HomeIcon,
    color: 'blue'
  },
  {
    id: 4,
    type: 'delivery',
    title: 'Parcel Delivery',
    date: 'April 28, 4:45 PM',
    location: 'Downtown to Suburbs',
    price: 12.0,
    status: 'completed',
    ecoPoints: 120,
    icon: PackageIcon,
    color: 'blue'
  },
  {
    id: 5,
    type: 'car-wash',
    title: 'Car Wash - Basic',
    date: 'April 20, 11:00 AM',
    location: '789 Elm Street',
    price: 15.99,
    status: 'completed',
    ecoPoints: 160,
    icon: CarIcon,
    color: 'teal'
  },
  {
    id: 6,
    type: 'window-solar-clean',
    title: 'Solar Panel Cleaning',
    date: 'April 15, 9:30 AM',
    location: '321 Pine Road',
    price: 45.0,
    status: 'completed',
    ecoPoints: 450,
    icon: SunIcon,
    color: 'blue'
  }];

  const filters = [
  {
    id: 'all',
    label: 'All Services'
  },
  {
    id: 'car-wash',
    label: 'Car Wash'
  },
  {
    id: 'taxi',
    label: 'Taxi'
  },
  {
    id: 'window-solar-clean',
    label: 'Cleaning'
  },
  {
    id: 'delivery',
    label: 'Delivery'
  }];

  const filteredHistory =
  selectedFilter === 'all' ?
  serviceHistory :
  serviceHistory.filter((service) => service.type === selectedFilter);
  const totalSpent = serviceHistory.reduce(
    (sum, service) => sum + service.price,
    0
  );
  const totalEcoPoints = serviceHistory.reduce(
    (sum, service) => sum + service.ecoPoints,
    0
  );
  const exportHistory = () => {
    const headers = ['id', 'type', 'title', 'date', 'location', 'price', 'status', 'ecoPoints'];
    const rows = filteredHistory.map((service) => [
      String(service.id),
      service.type,
      service.title,
      service.date,
      service.location,
      String(service.price),
      service.status,
      String(service.ecoPoints)
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'service-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-6 px-4 text-white">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeftIcon size={24} />
          </button>
          <h1 className="text-2xl font-bold">Service History</h1>
        </div>

        {/* Search Bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center">
          <SearchIcon size={18} className="mr-2" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 text-white placeholder-white/70 outline-none" />

        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white mx-4 rounded-xl shadow-sm p-4 -mt-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">
              {serviceHistory.length}
            </p>
            <p className="text-xs text-gray-500">Total Services</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSpent)}
            </p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatPoints(totalEcoPoints)}
            </p>
            <p className="text-xs text-gray-500">EcoPoints Earned</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filter) =>
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${selectedFilter === filter.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-600'}`}>

                {filter.label}
              </button>
            )}
          </div>
          <button
            className="bg-white p-2 rounded-lg ml-2"
            onClick={() => setSelectedFilter('all')}>
            <FilterIcon size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Service List */}
      <div className="px-4 space-y-3">
        {filteredHistory.map((service) => {
          const Icon = service.icon;
          return (
            <div key={service.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start">
                  <div
                    className={`bg-${service.color}-100 p-2 rounded-lg mr-3`}>

                    <Icon size={18} className={`text-${service.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {service.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{service.date}</p>
                    <p className="text-xs text-gray-500">{service.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {formatCurrency(service.price)}
                  </p>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Completed
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <span className="text-teal-600 font-medium">
                    +{formatPoints(service.ecoPoints)} EcoPoints
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const { icon, ...serviceData } = service;
                      navigate('/service-details', {
                        state: {
                          service: serviceData
                        }
                      });
                    }}
                    className="text-teal-600 text-xs font-medium">

                    View Details
                  </button>
                  <button
                    className="text-gray-500 text-xs font-medium"
                    onClick={() => navigate(ROUTES.BOOK_SERVICE(service.type))}>
                    Rebook
                  </button>
                </div>
              </div>
            </div>);

        })}
      </div>

      {/* Export Button */}
      <div className="px-4 py-6">
        <button
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium flex items-center justify-center"
          onClick={exportHistory}>
          <DownloadIcon size={18} className="mr-2" />
          Export History
        </button>
      </div>
    </div>);

};
export default ServiceHistory;