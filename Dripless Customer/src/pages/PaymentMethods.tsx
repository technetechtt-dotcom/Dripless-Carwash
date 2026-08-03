import React, { useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  PlusIcon,
  CheckCircleIcon,
  TrashIcon,
  ShieldCheckIcon,
  XIcon,
  MoreVerticalIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
const container = {
  hidden: {
    opacity: 0
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
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
const PaymentMethods = () => {
  const navigate = useNavigate();
  const [showAddCard, setShowAddCard] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([
  {
    id: 1,
    type: 'Visa',
    last4: '4242',
    expiry: '12/25',
    holderName: 'Alex Johnson',
    isDefault: true,
    color: 'from-slate-700 to-slate-900'
  },
  {
    id: 2,
    type: 'Mastercard',
    last4: '8888',
    expiry: '08/26',
    holderName: 'Alex Johnson',
    isDefault: false,
    color: 'from-indigo-500 to-purple-600'
  }]
  );
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    holderName: '',
    expiry: '',
    cvv: ''
  });
  const handleSetDefault = (id: number) => {
    setPaymentMethods(
      paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === id
      }))
    );
    toast.success('Default payment method updated');
  };
  const handleDeleteCard = (id: number) => {
    setPaymentMethods(paymentMethods.filter((method) => method.id !== id));
    toast.success('Card removed successfully');
  };
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock save
    const newId = Math.max(...paymentMethods.map((m) => m.id)) + 1;
    const cardType = newCard.cardNumber.startsWith('4') ? 'Visa' : 'Mastercard';
    setPaymentMethods([
    ...paymentMethods,
    {
      id: newId,
      type: cardType,
      last4: newCard.cardNumber.slice(-4) || '1234',
      expiry: newCard.expiry,
      holderName: newCard.holderName,
      isDefault: false,
      color: 'from-emerald-500 to-teal-600'
    }]
    );
    setShowAddCard(false);
    setNewCard({
      cardNumber: '',
      holderName: '',
      expiry: '',
      cvv: ''
    });
    toast.success('New card added successfully');
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
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
            Payment Methods
          </h1>
        </div>
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => setShowAddCard(true)}
          className="p-2 bg-eco-500 rounded-xl text-white shadow-md shadow-eco-500/20">

          <PlusIcon size={20} />
        </motion.button>
      </div>

      <div className="p-4 space-y-5">
        {/* Cards List */}
        {paymentMethods.map((method) =>
        <motion.div
          key={method.id}
          variants={item}
          className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br ${method.color}`}>

            {/* Card Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-8 -mb-8 blur-xl"></div>

            <div className="relative z-10 flex justify-between items-start mb-8">
              <CreditCardIcon size={28} className="opacity-90" />
              {method.isDefault &&
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center">
                  <CheckCircleIcon size={10} className="mr-1" /> Default
                </span>
            }
            </div>

            <div className="relative z-10 mb-6">
              <p className="font-mono text-xl tracking-widest opacity-90">
                •••• •••• •••• {method.last4}
              </p>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase opacity-70 mb-0.5">
                  Card Holder
                </p>
                <p className="font-medium text-sm">{method.holderName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-70 mb-0.5">
                  Expires
                </p>
                <p className="font-medium text-sm">{method.expiry}</p>
              </div>
            </div>

            {/* Actions Overlay (visible on hover or tap) */}
            <div className="absolute top-4 right-4 flex gap-2">
              {!method.isDefault &&
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSetDefault(method.id);
              }}
              className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
              title="Set as Default">

                  <CheckCircleIcon size={16} />
                </button>
            }
              <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCard(method.id);
              }}
              className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-red-500/50 transition-colors"
              title="Remove Card">

                <TrashIcon size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Add New Button (Inline) */}
        <motion.button
          variants={item}
          whileTap={{
            scale: 0.98
          }}
          onClick={() => setShowAddCard(true)}
          className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-medium hover:border-eco-500 hover:text-eco-500 transition-colors">

          <PlusIcon size={20} className="mr-2" />
          Add New Card
        </motion.button>

        {/* Security Notice */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center border-l-4 border-l-blue-500">

          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
            <ShieldCheckIcon
              size={18}
              className="text-blue-600 dark:text-blue-400" />

          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Your payment information is encrypted and secure. We never store
            your full card details.
          </p>
        </motion.div>
      </div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddCard &&
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
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
            onClick={() => setShowAddCard(false)} />

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
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Add New Card
                </h2>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => setShowAddCard(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={20} className="text-slate-500" />
                </motion.button>
              </div>

              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                    Card Number
                  </label>
                  <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={newCard.cardNumber}
                  onChange={(e) =>
                  setNewCard({
                    ...newCard,
                    cardNumber: e.target.value
                  })
                  }
                  className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 font-mono"
                  required />

                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                    Cardholder Name
                  </label>
                  <input
                  type="text"
                  placeholder="John Doe"
                  value={newCard.holderName}
                  onChange={(e) =>
                  setNewCard({
                    ...newCard,
                    holderName: e.target.value
                  })
                  }
                  className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400"
                  required />

                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Expiry Date
                    </label>
                    <input
                    type="text"
                    placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) =>
                    setNewCard({
                      ...newCard,
                      expiry: e.target.value
                    })
                    }
                    className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 text-center"
                    required />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      CVV
                    </label>
                    <input
                    type="text"
                    placeholder="123"
                    value={newCard.cvv}
                    onChange={(e) =>
                    setNewCard({
                      ...newCard,
                      cvv: e.target.value
                    })
                    }
                    className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 text-center"
                    required />

                  </div>
                </div>

                <motion.button
                whileTap={{
                  scale: 0.96
                }}
                type="submit"
                className="btn-primary w-full py-4 font-bold mt-4 shadow-lg shadow-eco-500/20">

                  Add Card
                </motion.button>
              </form>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default PaymentMethods;