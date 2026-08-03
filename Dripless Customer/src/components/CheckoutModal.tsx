import React, { useState } from 'react';
import {
  XIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckCircleIcon,
  WalletIcon,
  BanknoteIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookings } from '../contexts/BookingContext';
import { formatCurrency, formatPoints } from '../utils/currency';
type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedPackage?: {
    name: string;
    price: number;
  };
  customServices?: Array<{
    name: string;
    price: number;
  }>;
  date: string;
  time: string;
  location: string;
  paymentMethod: string;
};
const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedPackage,
  customServices,
  date,
  time,
  location,
  paymentMethod
}) => {
  const { walletBalance } = useBookings();
  const [selectedPayment, setSelectedPayment] = useState<
    'card' | 'wallet' | 'caw'>(
    'card');
  const calculateTotal = () => {
    if (selectedPackage) {
      return selectedPackage.price;
    }
    if (customServices) {
      return customServices.reduce((total, service) => total + service.price, 0);
    }
    return 0;
  };
  const total = calculateTotal();
  const canPayWithWallet = walletBalance >= total;
  const paymentOptions = [
  {
    id: 'card' as const,
    label: 'Pay with Card',
    sublabel: paymentMethod,
    icon: CreditCardIcon,
    color: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    available: true
  },
  {
    id: 'wallet' as const,
    label: 'Dripless Wallet',
    sublabel: `Balance: ${formatCurrency(walletBalance)}`,
    icon: WalletIcon,
    color: 'bg-eco-100 dark:bg-eco-900/30',
    iconColor: 'text-eco-600 dark:text-eco-400',
    available: canPayWithWallet
  },
  {
    id: 'caw' as const,
    label: 'Cash After Wash',
    sublabel: 'Pay when service is complete',
    icon: BanknoteIcon,
    color: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    available: true
  }];

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -20
    },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.06,
        duration: 0.3
      }
    })
  };
  return (
    <AnimatePresence>
      {isOpen &&
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose} />


          <motion.div
          initial={{
            y: '100%'
          }}
          animate={{
            y: 0
          }}
          exit={{
            y: '100%'
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300
          }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Confirm Booking
              </h2>
              <motion.button
              whileTap={{
                scale: 0.9
              }}
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">

                <XIcon
                size={20}
                className="text-slate-500 dark:text-slate-400" />

              </motion.button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Service Details */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Service
                </h3>
                {selectedPackage ?
              <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {selectedPackage.name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 px-3 py-1 rounded-lg shadow-sm">
                      {formatCurrency(selectedPackage.price)}
                    </span>
                  </div> :

              <div className="space-y-3">
                    {customServices?.map((service, index) =>
                <div
                  key={index}
                  className="flex justify-between items-center">

                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {service.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                )}
                  </div>
              }
              </div>

              {/* Booking Information */}
              <div className="space-y-4 mb-6">
                <motion.div
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center">

                  <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mr-4">
                    <CalendarIcon size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      Date
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {date}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                custom={1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center">

                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mr-4">
                    <ClockIcon size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      Time
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {time}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                custom={2}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center">

                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-4">
                    <MapPinIcon size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      Location
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {location}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Payment Options */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Payment Method
                </h3>
                <div className="space-y-2.5">
                  {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedPayment === option.id;
                  return (
                    <motion.div
                      key={option.id}
                      whileTap={{
                        scale: 0.98
                      }}
                      onClick={() =>
                      option.available && setSelectedPayment(option.id)
                      }
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center ${isSelected ? 'border-eco-500 bg-eco-50/50 dark:bg-eco-900/20' : option.available ? 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600' : 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'}`}>

                        <div
                        className={`${option.color} p-2.5 rounded-lg mr-3`}>

                          <Icon size={18} className={option.iconColor} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {option.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {option.sublabel}
                          </p>
                        </div>
                        <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-eco-500 bg-eco-500' : 'border-slate-300 dark:border-slate-600'}`}>

                          {isSelected &&
                        <CheckCircleIcon size={12} className="text-white" />
                        }
                        </div>
                      </motion.div>);

                })}
                </div>
                {!canPayWithWallet && selectedPayment === 'wallet' &&
              <p className="text-xs text-red-500 mt-2 ml-1">
                    Insufficient wallet balance
                  </p>
              }
              </div>

              {/* Total */}
              <motion.div
              initial={{
                scale: 0.95,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              transition={{
                delay: 0.25
              }}
              className="bg-gradient-to-r from-eco-500 to-teal-600 text-white rounded-2xl p-5 mb-6 shadow-lg shadow-eco-500/20">

                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium opacity-90">
                    Total Amount
                  </span>
                  <span className="text-3xl font-bold">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex items-center mt-2 text-eco-100 text-sm font-medium">
                  <span className="mr-1.5 text-lg">🌱</span>
                  You'll earn {formatPoints(Math.round(total * 10))} EcoPoints
                </div>
                {selectedPayment === 'caw' &&
              <div className="mt-2 bg-white/20 rounded-lg px-3 py-1.5 text-xs font-medium">
                    💵 Pay cash to your washer after service completion
                  </div>
              }
              </motion.div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                whileTap={{
                  scale: 0.96
                }}
                onClick={onClose}
                className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">

                  Cancel
                </motion.button>
                <motion.button
                whileTap={{
                  scale: 0.96
                }}
                onClick={onConfirm}
                className="btn-primary py-4 font-bold text-lg">

                  Confirm Booking
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

};
export default CheckoutModal;