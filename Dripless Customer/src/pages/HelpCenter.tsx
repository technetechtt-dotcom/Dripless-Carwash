import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  SearchIcon,
  BookOpenIcon,
  VideoIcon,
  FileTextIcon,
  MessageCircleIcon,
  ChevronRightIcon } from
'lucide-react';
const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const categories = [
  {
    id: 1,
    title: 'Getting Started',
    icon: BookOpenIcon,
    color: 'bg-blue-100 text-blue-600',
    articles: 5,
    topics: [
    'Creating your account',
    'Setting up your profile',
    'Adding payment methods',
    'Understanding EcoPoints',
    'Navigating the app']

  },
  {
    id: 2,
    title: 'Booking Services',
    icon: FileTextIcon,
    color: 'bg-teal-100 text-teal-600',
    articles: 8,
    topics: [
    'How to book a car wash',
    'Scheduling a cleaning service',
    'Booking an eco taxi',
    'Parcel delivery options',
    'Canceling or rescheduling']

  },
  {
    id: 3,
    title: 'Payments & Wallet',
    icon: FileTextIcon,
    color: 'bg-purple-100 text-purple-600',
    articles: 6,
    topics: [
    'Adding funds to wallet',
    'Payment methods accepted',
    'Managing saved cards',
    'Transaction history']

  },
  {
    id: 4,
    title: 'EcoPoints & Rewards',
    icon: FileTextIcon,
    color: 'bg-green-100 text-green-600',
    articles: 4,
    topics: [
    'How to earn EcoPoints',
    'Redeeming rewards',
    'Points expiration policy']

  }];

  const popularArticles = [
  {
    id: 1,
    title: 'How to book your first service',
    category: 'Getting Started',
    readTime: '3 min'
  },
  {
    id: 2,
    title: 'Understanding EcoPoints and rewards',
    category: 'EcoPoints & Rewards',
    readTime: '5 min'
  },
  {
    id: 3,
    title: 'Adding and managing payment methods',
    category: 'Payments & Wallet',
    readTime: '4 min'
  }];

  const videoTutorials = [
  {
    id: 1,
    title: 'App Overview & Navigation',
    duration: '2:30',
    thumbnail: 'bg-gradient-to-br from-teal-400 to-blue-500'
  },
  {
    id: 2,
    title: 'Booking Your First Car Wash',
    duration: '3:15',
    thumbnail: 'bg-gradient-to-br from-blue-400 to-purple-500'
  }];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-8 px-4 text-white">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeftIcon size={24} />
          </button>
          <h1 className="text-2xl font-bold">Help Center</h1>
        </div>

        <p className="text-sm text-white/90 mb-4">
          Find answers, guides, and tutorials
        </p>

        {/* Search Bar */}
        <div className="bg-white rounded-lg p-3 flex items-center">
          <SearchIcon size={18} className="mr-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-gray-800 outline-none" />

        </div>
      </div>

      <div className="px-4 py-6">
        {/* Popular Articles */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Popular Articles</h2>
          <div className="space-y-2">
            {popularArticles.map((article) =>
            <div
              key={article.id}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">

                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">{article.title}</h3>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{article.category}</span>
                    <span className="mx-2">•</span>
                    <span>{article.readTime} read</span>
                  </div>
                </div>
                <ChevronRightIcon size={18} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Video Tutorials</h2>
          <div className="grid grid-cols-1 gap-3">
            {videoTutorials.map((video) =>
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden">

                <div
                className={`${video.thumbnail} h-32 flex items-center justify-center`}>

                  <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full">
                    <VideoIcon size={24} className="text-teal-600" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm mb-1">{video.title}</h3>
                  <p className="text-xs text-gray-500">{video.duration}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Browse by Category */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Browse by Category</h2>
          <div className="space-y-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  className="bg-white rounded-lg shadow-sm p-4">

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`${category.color} p-2 rounded-lg mr-3`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.title}</h3>
                        <p className="text-xs text-gray-500">
                          {category.articles} articles
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon size={18} className="text-gray-400" />
                  </div>
                  <div className="pl-11">
                    <ul className="text-xs text-gray-600 space-y-1">
                      {category.topics.slice(0, 3).map((topic, index) =>
                      <li key={index}>• {topic}</li>
                      )}
                    </ul>
                  </div>
                </div>);

            })}
          </div>
        </div>

        {/* Still Need Help */}
        <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-xl p-6 text-white text-center">
          <MessageCircleIcon size={32} className="mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Still Need Help?</h3>
          <p className="text-sm text-white/90 mb-4">
            Our support team is available 24/7 to assist you
          </p>
          <button
            onClick={() => navigate('/help-support')}
            className="bg-white text-teal-600 px-6 py-3 rounded-lg font-medium">

            Contact Support
          </button>
        </div>
      </div>
    </div>);

};
export default HelpCenter;