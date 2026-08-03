import React, { useEffect, useMemo, useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TicketIcon,
  GiftIcon,
  TagIcon,
  PhoneIcon,
  MailIcon,
  UserIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  SendIcon,
  XIcon,
  SparklesIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { authApi, specialsApi } from '@shared/api';
import type { OpsSpecial } from '@shared/types';
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
interface Voucher {
  id: string;
  code: string;
  value: number;
  description: string;
  expiryDate: string;
  status: 'active' | 'used' | 'sent';
  recipientName?: string;
  usedDate?: string;
}
const Vouchers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'redeem' | 'gift' | 'my-vouchers'>(
    'redeem'
  );
  const [voucherSubTab, setVoucherSubTab] = useState<
    'active' | 'used' | 'sent'>(
    'active');
  // Redeem state
  const [redeemPhone, setRedeemPhone] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  // Gift state
  const [giftName, setGiftName] = useState('');
  const [giftSurname, setGiftSurname] = useState('');
  const [giftPhone, setGiftPhone] = useState('');
  const [giftEmail, setGiftEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [liveSpecials, setLiveSpecials] = useState<OpsSpecial[]>([]);
  const [successMessage, setSuccessMessage] = useState({
    title: '',
    subtitle: ''
  });
  const [usedVouchers, setUsedVouchers] = useState<Voucher[]>([]);
  const [sentVouchers, setSentVouchers] = useState<Voucher[]>([]);
  const vouchers = useMemo<Voucher[]>(() => {
    const activeFromSpecials = liveSpecials.map((special) => ({
      id: special.id,
      code: special.promoCode,
      value: special.discountValue,
      description: special.title,
      expiryDate: new Date(special.endsAt).toLocaleDateString(),
      status: 'active' as const
    }));
    return [...activeFromSpecials, ...usedVouchers, ...sentVouchers];
  }, [liveSpecials, sentVouchers, usedVouchers]);
  const filteredVouchers = vouchers.filter((v) => v.status === voucherSubTab);
  useEffect(() => {
    let cancelled = false;
    const loadSpecials = async () => {
      try {
        const specials = await specialsApi.listVisibleSpecials('customer');
        if (!cancelled) {
          setLiveSpecials(specials);
        }
      } catch {
        if (!cancelled) {
          setLiveSpecials([]);
        }
      }
    };
    void loadSpecials();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleRedeem = async () => {
    if (!redeemPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!redeemCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }
    const enteredCode = redeemCode.trim().toUpperCase();
    const staticMatch = vouchers.find(
      (voucher) => voucher.code === enteredCode && voucher.status === 'active'
    );
    const specialMatch = liveSpecials.find((special) => special.promoCode === enteredCode);
    if (!staticMatch && !specialMatch) {
      toast.error('Code not found or not currently active');
      return;
    }
    if (specialMatch) {
      const currentCustomer = authApi.getCurrentCustomerProfile();
      if (!currentCustomer) {
        toast.error('Please sign in again to redeem specials');
        return;
      }
      try {
        await specialsApi.redeemSpecial({
          role: 'customer',
          userId: currentCustomer.id,
          promoCode: enteredCode
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to redeem special');
        return;
      }
    }
    setSuccessMessage({
      title: 'Voucher Redeemed!',
      subtitle: `Code ${enteredCode} applied to your account.`
    });
    setUsedVouchers((prev) => [
      {
        id: `used-${Date.now()}`,
        code: enteredCode,
        value: specialMatch?.discountValue ?? staticMatch?.value ?? 0,
        description: specialMatch?.title ?? staticMatch?.description ?? 'Redeemed voucher',
        expiryDate:
          specialMatch ? new Date(specialMatch.endsAt).toLocaleDateString() : 'N/A',
        status: 'used',
        usedDate: new Date().toLocaleDateString()
      },
      ...prev
    ]);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setRedeemPhone('');
      setRedeemCode('');
    }, 2500);
  };
  const handleSendGift = () => {
    if (!giftName.trim() || !giftSurname.trim()) {
      toast.error('Please enter recipient name');
      return;
    }
    if (!giftPhone.trim()) {
      toast.error('Please enter recipient phone number');
      return;
    }
    if (!giftEmail.trim()) {
      toast.error('Please enter recipient email');
      return;
    }
    if (!giftAmount) {
      toast.error('Please select a gift amount');
      return;
    }
    setSuccessMessage({
      title: 'Gift Sent! 🎁',
      subtitle: `$${giftAmount} voucher sent to ${giftName} ${giftSurname}.`
    });
    const sentAt = Date.now();
    setSentVouchers((prev) => [
      {
        id: `sent-${sentAt}`,
        code: `GIFT-${sentAt.toString(36).toUpperCase().slice(-6)}`,
        value: Number(giftAmount),
        description: `$${giftAmount} Dripless Gift Voucher`,
        expiryDate: new Date(sentAt + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'sent',
        recipientName: `${giftName} ${giftSurname}`
      },
      ...prev
    ]);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setGiftName('');
      setGiftSurname('');
      setGiftPhone('');
      setGiftEmail('');
      setGiftMessage('');
      setGiftAmount('');
    }, 2500);
  };
  const giftAmounts = [15, 25, 50, 100];
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
          Vouchers
        </h1>
      </div>

      <div className="p-4 space-y-5">
        {/* Main Tabs */}
        <motion.div
          variants={item}
          className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">

          <button
            className={`py-2.5 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'redeem' ? 'bg-white dark:bg-slate-700 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setActiveTab('redeem')}>

            <TagIcon size={14} />
            Redeem
          </button>
          <button
            className={`py-2.5 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'gift' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setActiveTab('gift')}>

            <GiftIcon size={14} />
            Send Gift
          </button>
          <button
            className={`py-2.5 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'my-vouchers' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setActiveTab('my-vouchers')}>

            <TicketIcon size={14} />
            My Vouchers
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'redeem' ?
          <motion.div variants={item} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Live Specials (Ops Approved)
              </h3>
              {liveSpecials.length === 0 ?
            <div className="glass-card p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No live specials right now
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Specials appear here only after Ops Admin approval and activation.
                  </p>
                </div> :
            liveSpecials.slice(0, 3).map((special) =>
            <div
              key={special.id}
              className="glass-card p-4 border-l-4 border-l-emerald-500">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {special.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {special.description}
                      </p>
                      <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300 mt-2">
                        Code: {special.promoCode}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {special.discountType === 'PERCENT' ?
                  `${special.discountValue}% off` :
                  `$${special.discountValue.toFixed(2)} off`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Valid until {new Date(special.endsAt).toLocaleDateString()}
                  </p>
                </div>
            )}
            </motion.div> :
          null}

          {/* REDEEM TAB */}
          {activeTab === 'redeem' &&
          <motion.div
            key="redeem"
            initial={{
              opacity: 0,
              x: -20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: 20
            }}
            className="space-y-5">

              {/* Banner */}
              <div className="bg-gradient-to-br from-eco-500 to-teal-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                    <TagIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Redeem Voucher</h3>
                    <p className="text-sm text-white/80">
                      Enter your code to claim your reward
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="glass-card p-5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                  type="tel"
                  value={redeemPhone}
                  onChange={(e) => setRedeemPhone(e.target.value)}
                  placeholder="+27 XX XXX XXXX"
                  className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                  <PhoneIcon
                  size={16}
                  className="absolute left-3.5 top-4 text-slate-400" />

                </div>
              </div>

              {/* Voucher Code */}
              <div className="glass-card p-5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1">
                  Voucher Code
                </label>
                <div className="relative">
                  <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) =>
                  setRedeemCode(e.target.value.toUpperCase())
                  }
                  placeholder="Enter voucher code"
                  className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 font-mono tracking-wider" />

                  <TicketIcon
                  size={16}
                  className="absolute left-3.5 top-4 text-slate-400" />

                </div>
              </div>

              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => {
                void handleRedeem();
              }}
              className="btn-primary w-full py-4 font-bold flex items-center justify-center gap-2">

                <CheckCircleIcon size={18} />
                Redeem Voucher
              </motion.button>
            </motion.div>
          }

          {/* SEND GIFT TAB */}
          {activeTab === 'gift' &&
          <motion.div
            key="gift"
            initial={{
              opacity: 0,
              x: -20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: 20
            }}
            className="space-y-5">

              {/* Banner */}
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                    <GiftIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Send a Gift</h3>
                    <p className="text-sm text-white/80">
                      Treat someone to a Dripless wash
                    </p>
                  </div>
                </div>
              </div>

              {/* Gift Amount */}
              <div className="glass-card p-5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 ml-1">
                  Gift Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {giftAmounts.map((amt) =>
                <button
                  key={amt}
                  onClick={() => setGiftAmount(amt.toString())}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${giftAmount === amt.toString() ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>

                      ${amt}
                    </button>
                )}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Recipient Details
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Name *
                    </label>
                    <div className="relative">
                      <input
                      type="text"
                      value={giftName}
                      onChange={(e) => setGiftName(e.target.value)}
                      placeholder="First name"
                      className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                      <UserIcon
                      size={14}
                      className="absolute left-3.5 top-3.5 text-slate-400" />

                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Surname *
                    </label>
                    <input
                    type="text"
                    value={giftSurname}
                    onChange={(e) => setGiftSurname(e.target.value)}
                    placeholder="Last name"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <input
                    type="tel"
                    value={giftPhone}
                    onChange={(e) => setGiftPhone(e.target.value)}
                    placeholder="+27 XX XXX XXXX"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                    <PhoneIcon
                    size={14}
                    className="absolute left-3.5 top-3.5 text-slate-400" />

                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                    Email *
                  </label>
                  <div className="relative">
                    <input
                    type="email"
                    value={giftEmail}
                    onChange={(e) => setGiftEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                    <MailIcon
                    size={14}
                    className="absolute left-3.5 top-3.5 text-slate-400" />

                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                    Message{' '}
                    <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 resize-none h-20" />

                    <MessageSquareIcon
                    size={14}
                    className="absolute left-3.5 top-3.5 text-slate-400" />

                  </div>
                </div>
              </div>

              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={handleSendGift}
              className="w-full py-4 font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20 rounded-xl">

                <SendIcon size={18} />
                Send Gift {giftAmount && `— $${giftAmount}`}
              </motion.button>
            </motion.div>
          }

          {/* MY VOUCHERS TAB */}
          {activeTab === 'my-vouchers' &&
          <motion.div
            key="my-vouchers"
            initial={{
              opacity: 0,
              x: 20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: -20
            }}
            className="space-y-4">

              {/* Sub-tabs */}
              <div className="flex gap-2">
                {(['active', 'used', 'sent'] as const).map((tab) => {
                const count = vouchers.filter((v) => v.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setVoucherSubTab(tab)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${voucherSubTab === tab ? tab === 'active' ? 'bg-eco-500 text-white' : tab === 'used' ? 'bg-slate-600 text-white' : 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>

                      {tab}
                      {count > 0 &&
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${voucherSubTab === tab ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-600'}`}>

                          {count}
                        </span>
                    }
                    </button>);

              })}
              </div>

              {/* Voucher List */}
              {filteredVouchers.length === 0 ?
            <div className="glass-card p-8 text-center">
                  <div className="bg-slate-100 dark:bg-slate-700 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TicketIcon size={24} className="text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No {voucherSubTab} vouchers
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {voucherSubTab === 'active' ?
                'Redeem a code to get started' :
                voucherSubTab === 'used' ?
                'Used vouchers will appear here' :
                'Sent gifts will appear here'}
                  </p>
                </div> :

            <div className="space-y-3">
                  {filteredVouchers.map((voucher) =>
              <motion.div
                key={voucher.id}
                variants={item}
                className={`glass-card overflow-hidden ${voucher.status === 'active' ? 'border-l-4 border-l-eco-500' : voucher.status === 'sent' ? 'border-l-4 border-l-purple-500' : ''}`}>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <div
                        className={`p-2 rounded-lg mr-3 ${voucher.status === 'active' ? 'bg-eco-100 dark:bg-eco-900/30' : voucher.status === 'sent' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>

                              {voucher.status === 'sent' ?
                        <GiftIcon
                          size={16}
                          className="text-purple-500" /> :


                        <TicketIcon
                          size={16}
                          className={
                          voucher.status === 'active' ?
                          'text-eco-600 dark:text-eco-400' :
                          'text-slate-400'
                          } />

                        }
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {voucher.description}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {voucher.code}
                              </p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-slate-800 dark:text-white">
                            ${voucher.value}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                            <ClockIcon size={12} className="mr-1" />
                            {voucher.status === 'used' ?
                      `Used: ${voucher.usedDate}` :
                      `Expires: ${voucher.expiryDate}`}
                          </div>
                          {voucher.status === 'sent' &&
                    voucher.recipientName &&
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                To: {voucher.recipientName}
                              </span>
                    }
                          {voucher.status === 'active' &&
                    <motion.button
                      whileTap={{
                        scale: 0.96
                      }}
                      onClick={() => navigate('/booking/car-wash')}
                      className="text-xs font-bold text-eco-600 dark:text-eco-400">

                              Use Now
                            </motion.button>
                    }
                        </div>
                      </div>
                    </motion.div>
              )}
                </div>
            }
            </motion.div>
          }
        </AnimatePresence>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess &&
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">

            <motion.div
            initial={{
              scale: 0.5,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.5,
              opacity: 0
            }}
            transition={{
              type: 'spring',
              damping: 20
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-2xl mx-6">

              <motion.div
              initial={{
                scale: 0
              }}
              animate={{
                scale: 1
              }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200
              }}
              className="bg-eco-100 dark:bg-eco-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">

                <SparklesIcon size={32} className="text-eco-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {successMessage.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {successMessage.subtitle}
              </p>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default Vouchers;