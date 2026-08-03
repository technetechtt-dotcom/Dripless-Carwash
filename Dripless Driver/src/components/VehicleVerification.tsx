import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ChevronRight, Upload, X } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { useToast } from '../contexts/ToastContext';
interface VehicleVerificationProps {
  onClose: () => void;
}
export function VehicleVerification({ onClose }: VehicleVerificationProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    plate: ''
  });
  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Verification submitted successfully!', 'success');
      onClose();
    }, 2000);
  };
  const renderStep1 = () =>
  <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        Vehicle Details
      </h3>
      <div className="space-y-3">
        <input
        type="text"
        placeholder="Make (e.g. Toyota)"
        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        value={formData.make}
        onChange={(e) =>
        setFormData({
          ...formData,
          make: e.target.value
        })
        } />

        <input
        type="text"
        placeholder="Model (e.g. Camry)"
        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        value={formData.model}
        onChange={(e) =>
        setFormData({
          ...formData,
          model: e.target.value
        })
        } />

        <div className="grid grid-cols-2 gap-3">
          <input
          type="text"
          placeholder="Year"
          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={formData.year}
          onChange={(e) =>
          setFormData({
            ...formData,
            year: e.target.value
          })
          } />

          <input
          type="text"
          placeholder="Plate Number"
          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={formData.plate}
          onChange={(e) =>
          setFormData({
            ...formData,
            plate: e.target.value
          })
          } />

        </div>
      </div>
      <GlassButton onClick={() => setStep(2)} className="w-full mt-4">
        Next Step <ChevronRight size={16} className="ml-2 inline" />
      </GlassButton>
    </div>;

  const renderStep2 = () =>
  <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        Upload Photos
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Please upload clear photos of your vehicle.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {['Front', 'Back', 'Left Side', 'Right Side'].map((side) =>
      <div
        key={side}
        className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">

            <Camera size={24} className="text-slate-400 mb-2" />
            <span className="text-xs text-slate-500 font-medium">{side}</span>
          </div>
      )}
      </div>

      <div className="flex gap-3 mt-4">
        <GlassButton
        variant="secondary"
        onClick={() => setStep(1)}
        className="flex-1">

          Back
        </GlassButton>
        <GlassButton
        onClick={handleSubmit}
        className="flex-1"
        disabled={loading}>

          {loading ? 'Submitting...' : 'Submit Verification'}
        </GlassButton>
      </div>
    </div>;

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.95
      }}
      animate={{
        opacity: 1,
        scale: 1
      }}
      exit={{
        opacity: 0,
        scale: 0.95
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">

      <GlassCard className="w-full max-w-md p-6 relative" elevated>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">

          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 mb-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>

            1
          </div>
          <div
            className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>

            2
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{
              x: 20,
              opacity: 0
            }}
            animate={{
              x: 0,
              opacity: 1
            }}
            exit={{
              x: -20,
              opacity: 0
            }}>

            {step === 1 ? renderStep1() : renderStep2()}
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </motion.div>);

}