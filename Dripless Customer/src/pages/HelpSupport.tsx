import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MessageCircleIcon,
  MailIcon,
  PhoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon } from
'lucide-react';
const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const faqs = [
  {
    id: 1,
    question: 'How do I book a service?',
    answer:
    'You can book a service by selecting the service type from the Services page, choosing your preferred options, selecting a date and time, and confirming your booking. You will receive a confirmation notification once your booking is complete.'
  },
  {
    id: 2,
    question: 'How do EcoPoints work?',
    answer:
    'EcoPoints are earned with every booking you make. For every dollar spent, you earn 10 EcoPoints. You can redeem these points for discounts on future services or exchange them for rewards in the Rewards section.'
  },
  {
    id: 3,
    question: 'Can I cancel or reschedule my booking?',
    answer:
    'Yes, you can cancel or reschedule your booking up to 2 hours before the scheduled time without any charges. To do this, go to your booking details and select the cancel or reschedule option.'
  },
  {
    id: 4,
    question: 'What payment methods are accepted?',
    answer:
    'We accept all major credit and debit cards including Visa, Mastercard, and American Express. You can also use your Eco Wallet balance to pay for services.'
  },
  {
    id: 5,
    question: 'How do I add funds to my Eco Wallet?',
    answer:
    'Go to your Profile, select Eco Wallet, and click on "Add Funds". You can add funds using any of your saved payment methods or add a new card.'
  },
  {
    id: 6,
    question: 'Is my payment information secure?',
    answer:
    'Yes, we use industry-standard encryption to protect your payment information. We never store your full card details on our servers. All transactions are processed through secure payment gateways.'
  },
  {
    id: 7,
    question: 'How can I track my service?',
    answer:
    'Once your service is confirmed, you can track it in real-time from the Tracking page. You will also receive notifications about the status of your service.'
  },
  {
    id: 8,
    question: 'What makes these services eco-friendly?',
    answer:
    'All our services use environmentally friendly products and practices. Our car wash uses biodegradable soaps, our taxis are hybrid or electric vehicles, and our cleaning services use non-toxic, eco-friendly cleaning solutions.'
  }];

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };
  const filteredFaqs = faqs.filter(
    (faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-6 px-4 text-white">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeftIcon size={24} />
          </button>
          <h1 className="text-2xl font-bold">Help & Support</h1>
        </div>
        {/* Search Bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center">
          <SearchIcon size={18} className="mr-2" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 text-white placeholder-white/70 outline-none" />

        </div>
      </div>
      <div className="px-4 py-6">
        {/* Contact Options */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-4">Contact Us</h3>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center p-3 bg-teal-50 rounded-lg"
              onClick={() => navigate('/feedback')}>
              <div className="bg-teal-500 p-2 rounded-lg mr-3">
                <MessageCircleIcon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">Live Chat</p>
                <p className="text-xs text-gray-500">
                  Available 24/7 for instant help
                </p>
              </div>
            </button>
            <button
              type="button"
              className="w-full flex items-center p-3 bg-blue-50 rounded-lg"
              onClick={() => {
                window.location.href = 'mailto:support@ecoservices.com';
              }}>
              <div className="bg-blue-500 p-2 rounded-lg mr-3">
                <MailIcon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">Email Support</p>
                <p className="text-xs text-gray-500">support@ecoservices.com</p>
              </div>
            </button>
            <button
              type="button"
              className="w-full flex items-center p-3 bg-green-50 rounded-lg"
              onClick={() => {
                window.location.href = 'tel:+15551234567';
              }}>
              <div className="bg-green-500 p-2 rounded-lg mr-3">
                <PhoneIcon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">Phone Support</p>
                <p className="text-xs text-gray-500">+1 (555) 123-4567</p>
              </div>
            </button>
          </div>
        </div>
        {/* FAQs */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {filteredFaqs.map((faq) =>
            <div
              key={faq.id}
              className="border-b border-gray-100 last:border-0">

                <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full py-4 flex items-center justify-between text-left">

                  <span className="font-medium pr-4">{faq.question}</span>
                  {expandedFaq === faq.id ?
                <ChevronUpIcon
                  size={18}
                  className="text-gray-400 flex-shrink-0" /> :


                <ChevronDownIcon
                  size={18}
                  className="text-gray-400 flex-shrink-0" />

                }
                </button>
                {expandedFaq === faq.id &&
              <div className="pb-4 text-sm text-gray-600">{faq.answer}</div>
              }
              </div>
            )}
          </div>
        </div>
        {/* POPIA Compliance Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-3">POPIA Compliance</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              We are committed to protecting your personal information in
              accordance with the South African Protection of Personal
              Information Act (POPIA), Act 4 of 2013.
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2">
                Your Rights Under POPIA
              </h4>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Right to access your personal information</li>
                <li>Right to correct or delete your information</li>
                <li>Right to object to processing of your data</li>
                <li>
                  Right to lodge a complaint with the Information Regulator
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2">
                How We Protect Your Data
              </h4>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>
                  We collect only necessary information for service delivery
                </li>
                <li>Your data is encrypted and stored securely</li>
                <li>We never share your information without consent</li>
                <li>You can request data deletion at any time</li>
              </ul>
            </div>
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-xs text-gray-700 mb-2">
                <span className="font-medium">Information Officer:</span>{' '}
                privacy@ecoservices.com
              </p>
              <p className="text-xs text-gray-700">
                <span className="font-medium">Information Regulator:</span>{' '}
                complaints.IR@justice.gov.za
              </p>
            </div>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-teal-600 text-sm font-medium">

              Read Full Privacy Policy →
            </button>
          </div>
        </div>
        {/* Additional Resources */}
        <div className="bg-teal-50 rounded-lg p-4 mt-6">
          <h3 className="font-semibold mb-2">Need More Help?</h3>
          <p className="text-sm text-gray-600 mb-3">
            Visit our comprehensive help center for detailed guides and
            tutorials.
          </p>
          <button
            onClick={() => navigate('/help-center')}
            className="text-teal-600 text-sm font-medium">

            Visit Help Center →
          </button>
        </div>
      </div>
    </div>);

};
export default HelpSupport;