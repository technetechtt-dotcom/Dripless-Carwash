import React, { Children } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, FileTextIcon } from 'lucide-react';
import { motion } from 'framer-motion';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};
const item = {
  hidden: {
    opacity: 0,
    y: 16
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};
const TermsConditions = () => {
  const navigate = useNavigate();
  const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
    'By accessing or using the Dripless Carwash application and services, you agree to be bound by these Terms and Conditions. If you do not agree to all the terms, you may not access or use our services.'
  },
  {
    title: '2. Service Description',
    content:
    'Dripless Carwash provides waterless, eco-friendly car washing and related cleaning services through our mobile application. Services include but are not limited to: car washing, window cleaning, solar panel cleaning, mattress cleaning, couch cleaning, and carpet cleaning.'
  },
  {
    title: '3. User Accounts',
    items: [
    'You must be at least 18 years old to create an account.',
    'You are responsible for maintaining the confidentiality of your account credentials.',
    'You agree to provide accurate and complete information during registration.',
    'You are responsible for all activities that occur under your account.',
    'We reserve the right to suspend or terminate accounts that violate these terms.']

  },
  {
    title: '4. Bookings & Payments',
    items: [
    'All bookings are subject to availability and confirmation.',
    'Prices are displayed in the local currency and include applicable taxes unless stated otherwise.',
    'Payment must be made through approved methods: Paystack hosted card checkout or an eligible Dripless Wallet balance.',
    'Cancellations made less than 2 hours before the scheduled service may incur a cancellation fee.',
    'Refunds for cancelled services will be credited to your Dripless Wallet within 24 hours.']

  },
  {
    title: '5. Dripless Wallet',
    items: [
    'The Dripless Wallet is a prepaid digital wallet for use within the application.',
    'Funds added to the wallet are non-transferable and non-refundable to external accounts.',
    'Wallet balances do not earn interest.',
    'We reserve the right to limit wallet top-up amounts for security purposes.',
    'Unused wallet balances will remain available for 12 months from the last transaction.']

  },
  {
    title: '6. Vouchers & Gifts',
    items: [
    'Vouchers are valid for the period specified at the time of issue.',
    'Vouchers cannot be exchanged for cash.',
    'Gift vouchers are non-refundable once sent to the recipient.',
    'We reserve the right to void vouchers obtained through fraudulent means.',
    'Only one voucher may be applied per booking unless otherwise stated.']

  },
  {
    title: '7. Vehicle Information',
    content:
    'You are responsible for providing accurate vehicle information. Dripless Carwash is not liable for damage resulting from incorrect vehicle details provided by the user.'
  },
  {
    title: '8. Limitation of Liability',
    content:
    'Dripless Carwash shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services. Our total liability shall not exceed the amount paid by you for the specific service giving rise to the claim.'
  },
  {
    title: '9. Intellectual Property',
    content:
    'All content, trademarks, logos, and intellectual property displayed in the application are owned by Dripless Carwash or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.'
  },
  {
    title: '10. Modifications',
    content:
    'We reserve the right to modify these Terms and Conditions at any time. Changes will be effective upon posting in the application. Continued use of our services after changes constitutes acceptance of the modified terms.'
  }];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center">
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full glass">

          <ArrowLeftIcon
            size={20}
            className="text-slate-700 dark:text-slate-200" />

        </motion.button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Terms & Conditions
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Last Updated Banner */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center border-l-4 border-l-blue-500">

          <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl mr-3">
            <FileTextIcon
              size={18}
              className="text-blue-600 dark:text-blue-400" />

          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Last Updated: January 15, 2026
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please read these terms carefully
            </p>
          </div>
        </motion.div>

        {/* Sections */}
        {sections.map((section, idx) =>
        <motion.div key={idx} variants={item} className="glass-card p-5">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3">
              {section.title}
            </h2>
            {section.content &&
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {section.content}
              </p>
          }
            {section.items &&
          <ul className="space-y-2">
                {section.items.map((listItem, i) =>
            <li
              key={i}
              className="flex items-start text-sm text-slate-600 dark:text-slate-300">

                    <span className="w-1.5 h-1.5 bg-eco-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="leading-relaxed">{listItem}</span>
                  </li>
            )}
              </ul>
          }
          </motion.div>
        )}

        {/* Contact */}
        <motion.div
          variants={item}
          className="glass-card p-5 border-l-4 border-l-eco-500">

          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
            Questions?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            If you have questions about these terms, contact us:
          </p>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>
              <span className="font-medium">Email:</span>{' '}
              legal@driplesscarwash.com
            </p>
            <p>
              <span className="font-medium">Phone:</span> +27 (0)11 123 4567
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>);

};
export default TermsConditions;
