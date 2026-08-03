import React, { useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  PlusIcon,
  MoreVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  XIcon,
  CalendarIcon,
  WalletIcon,
  FilterIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookings } from '../contexts/BookingContext';
import { notify } from '../utils/notify';
import { formatCurrency, formatSignedCurrency } from '../utils/currency';
import { ROUTES } from '../utils/routes';
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
const WalletManagement = () => {
  const navigate = useNavigate();
  const { walletBalance, addFunds, transactions } = useBookings();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount] = useState('');
  const [txFilter, setTxFilter] = useState<
    'all' | 'topup' | 'service' | 'reward' | 'refund'>(
    'all');
  const paymentMethods = [
  {
    id: 1,
    type: 'Visa',
    last4: '4242',
    expiry: '12/25',
    isDefault: true
  },
  {
    id: 2,
    type: 'Mastercard',
    last4: '8888',
    expiry: '08/26',
    isDefault: false
  }];

  const quickAmounts = [10, 25, 50, 100];
  const totalAdded = transactions.
  filter(
    (t) => t.type === 'topup' || t.type === 'reward' || t.type === 'refund'
  ).
  reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = Math.abs(
    transactions.
    filter((t) => t.type === 'service').
    reduce((sum, t) => sum + t.amount, 0)
  );
  const filteredTransactions =
  txFilter === 'all' ?
  transactions :
  transactions.filter((t) => t.type === txFilter);
  const handleAddFunds = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      notify.error('Please enter a valid amount');
      return;
    }
    addFunds(parsedAmount);
    setAmount('');
    setShowAddFunds(false);
  };
  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'topup')
    return {
      icon: ArrowDownIcon,
      bg: 'bg-eco-100 dark:bg-eco-900/30',
      color: 'text-eco-600 dark:text-eco-400'
    };
    if (type === 'reward')
    return {
      icon: TrendingUpIcon,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      color: 'text-amber-600 dark:text-amber-400'
    };
    if (type === 'refund')
    return {
      icon: ArrowDownIcon,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      color: 'text-blue-600 dark:text-blue-400'
    };
    return {
      icon: ArrowUpIcon,
      bg: 'bg-slate-100 dark:bg-slate-700',
      color: 'text-slate-600 dark:text-slate-400'
    };
  };
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Top-up';
      case 'service':
        return 'Service';
      case 'reward':
        return 'Reward';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-eco-500 to-teal-700 pt-6 pb-16 px-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center">
            <motion.button
              whileTap={{
                scale: 0.9
              }}
              onClick={() => navigate(-1)}
              className="mr-3 p-2 bg-white/20 backdrop-blur-sm rounded-full">

              <ArrowLeftIcon size={20} />
            </motion.button>
            <h1 className="text-2xl font-bold">Dripless Wallet</h1>
          </div>
        </div>

        {/* Balance Card */}
        <div className="relative z-10 bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon size={16} className="text-white/70" />
            <p className="text-white/70 text-sm font-medium">
              Available Balance
            </p>
          </div>
          <p className="text-4xl font-bold mb-5">
            {formatCurrency(walletBalance)}
          </p>
          <div className="flex gap-3">
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => setShowAddFunds(true)}
              className="flex-1 bg-white text-eco-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center shadow-lg">

              <PlusIcon size={18} className="mr-2" />
              Add Funds
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={item} className="mx-4 -mt-8 relative z-10">
        <div className="glass-card p-4 dark:bg-slate-800/90">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className="bg-eco-100 dark:bg-eco-900/30 p-2.5 rounded-xl mr-3">
                <ArrowDownIcon
                  size={18}
                  className="text-eco-600 dark:text-eco-400" />

              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Total Added
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalAdded)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl mr-3">
                <ArrowUpIcon size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Total Spent
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="p-4 space-y-5 mt-2">
        {/* Payment Methods */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              Payment Methods
            </h2>
            <button
              onClick={() => navigate(ROUTES.PAYMENT_METHODS)}
              className="text-eco-600 dark:text-eco-400 text-sm font-bold">

              + Add New
            </button>
          </div>
          {paymentMethods.map((method) =>
          <div
            key={method.id}
            className="glass-card p-4 flex items-center justify-between">

              <div className="flex items-center">
                <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl mr-3">
                  <CreditCardIcon
                  size={18}
                  className="text-slate-600 dark:text-slate-400" />

                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {method.type} •••• {method.last4}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Expires {method.expiry}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.isDefault &&
              <span className="bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    Default
                  </span>
              }
              </div>
            </div>
          )}
        </motion.div>

        {/* Transaction History */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              Transaction History
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'topup', 'service', 'reward', 'refund'] as const).map(
              (filter) =>
              <button
                key={filter}
                onClick={() => setTxFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${txFilter === filter ? 'bg-eco-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>

                  {filter === 'all' ? 'All' : getTypeLabel(filter)}
                </button>

            )}
          </div>

          {/* Transaction List */}
          <div className="glass-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
            {filteredTransactions.length === 0 ?
            <div className="p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No transactions found
                </p>
              </div> :

            filteredTransactions.map((transaction) => {
              const txStyle = getTransactionIcon(
                transaction.type,
                transaction.amount
              );
              const Icon = txStyle.icon;
              return (
                <div
                  key={transaction.id}
                  className="p-4 flex items-center justify-between">

                    <div className="flex items-center flex-1 min-w-0">
                      <div
                      className={`${txStyle.bg} p-2.5 rounded-xl mr-3 flex-shrink-0`}>

                        <Icon size={16} className={txStyle.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                            {transaction.title}
                          </h3>
                          <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${transaction.type === 'topup' ? 'bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400' : transaction.type === 'reward' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : transaction.type === 'refund' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>

                            {getTypeLabel(transaction.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CalendarIcon size={10} className="text-slate-400" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {transaction.date}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p
                    className={`font-bold text-sm ml-3 flex-shrink-0 ${transaction.amount > 0 ? 'text-eco-600 dark:text-eco-400' : 'text-slate-800 dark:text-slate-200'}`}>

                      {formatSignedCurrency(transaction.amount)}
                    </p>
                  </div>);

            })
            }
          </div>
        </motion.div>
      </div>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {showAddFunds &&
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
            onClick={() => setShowAddFunds(false)} />

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
                  Add Funds
                </h2>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => setShowAddFunds(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={20} className="text-slate-500" />
                </motion.button>
              </div>

              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block ml-1">
                  Enter Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                    $
                  </span>
                  <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 text-2xl font-bold bg-white/70 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-eco-500 focus:ring-2 focus:ring-eco-500/20 outline-none dark:text-white" />

                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 ml-1">
                  Quick Select
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {quickAmounts.map((quickAmount) =>
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${amount === quickAmount.toString() ? 'bg-eco-500 text-white shadow-md shadow-eco-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>

                      ${quickAmount}
                    </button>
                )}
                </div>
              </div>

              {amount && parseFloat(amount) > 0 &&
            <motion.div
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4">

                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500 dark:text-slate-400">
                      Amount
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatCurrency(parseFloat(amount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      New Balance
                    </span>
                    <span className="font-bold text-eco-600 dark:text-eco-400">
                      {formatCurrency(walletBalance + parseFloat(amount))}
                    </span>
                  </div>
                </motion.div>
            }

              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={handleAddFunds}
              className="btn-primary w-full py-4 font-bold text-lg">

                Add Funds
              </motion.button>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default WalletManagement;