import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon } from 'lucide-react';
const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-6 px-4 text-white">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeftIcon size={24} />
          </button>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Last Updated */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center">
          <ShieldCheckIcon size={20} className="text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Last Updated: May 15, 2024
            </p>
            <p className="text-xs text-blue-700">
              We are committed to protecting your privacy
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Introduction</h2>
          <p className="text-sm text-gray-600 mb-3">
            EcoServices ("we", "our", or "us") is committed to protecting your
            personal information and your right to privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our mobile application and services.
          </p>
          <p className="text-sm text-gray-600">
            By using our services, you agree to the collection and use of
            information in accordance with this policy and in compliance with
            the Protection of Personal Information Act (POPIA), Act 4 of 2013.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Information We Collect</h2>

          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-sm mb-2">Personal Information</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Name and contact information (email, phone number)</li>
                <li>Physical address for service delivery</li>
                <li>Payment information (processed securely)</li>
                <li>Account credentials</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">Usage Information</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Service booking history and preferences</li>
                <li>Location data for service delivery</li>
                <li>Device information and app usage statistics</li>
                <li>Communication preferences</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">
            How We Use Your Information
          </h2>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>To provide and maintain our services</li>
            <li>To process your bookings and payments</li>
            <li>To send you service updates and notifications</li>
            <li>To improve our services and user experience</li>
            <li>To communicate with you about promotions and offers</li>
            <li>To comply with legal obligations</li>
            <li>To prevent fraud and ensure security</li>
          </ul>
        </div>

        {/* POPIA Compliance */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">POPIA Compliance</h2>

          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-sm mb-2">Your Rights</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Right to access your personal information</li>
                <li>Right to correct inaccurate information</li>
                <li>Right to delete your information</li>
                <li>Right to object to processing</li>
                <li>Right to data portability</li>
                <li>
                  Right to lodge a complaint with the Information Regulator
                </li>
              </ul>
            </div>

            <div className="bg-teal-50 rounded-lg p-3">
              <h3 className="font-medium text-sm mb-2">
                Exercising Your Rights
              </h3>
              <p className="text-xs text-gray-700 mb-2">
                To exercise any of your rights under POPIA, please contact our
                Information Officer:
              </p>
              <p className="text-xs text-gray-700">
                <span className="font-medium">Email:</span>{' '}
                privacy@ecoservices.com
              </p>
              <p className="text-xs text-gray-700">
                <span className="font-medium">Phone:</span> +27 (0)11 123 4567
              </p>
            </div>
          </div>
        </div>

        {/* Data Security */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Data Security</h2>
          <p className="text-sm text-gray-600 mb-3">
            We implement appropriate technical and organizational security
            measures to protect your personal information, including:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments and updates</li>
            <li>Access controls and authentication</li>
            <li>Secure payment processing through certified providers</li>
            <li>Employee training on data protection</li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="bg-teal-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Contact Us</h2>
          <p className="text-sm text-gray-700 mb-3">
            If you have any questions about this Privacy Policy, please contact:
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Information Officer:</span>{' '}
              privacy@ecoservices.com
            </p>
            <p>
              <span className="font-medium">Phone:</span> +27 (0)11 123 4567
            </p>
            <p className="pt-2 border-t border-teal-200">
              <span className="font-medium">
                Information Regulator (South Africa):
              </span>
              <br />
              complaints.IR@justice.gov.za
            </p>
          </div>
        </div>
      </div>
    </div>);

};
export default PrivacyPolicy;