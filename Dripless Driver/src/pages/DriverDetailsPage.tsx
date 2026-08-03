import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Car,
  CreditCard,
  Camera } from
'lucide-react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
interface DriverDetailsPageProps {
  onBack: () => void;
}
export function DriverDetailsPage({ onBack }: DriverDetailsPageProps) {
  const { driver } = useDriverAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(driver?.avatarUrl ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    email: driver?.email || '',
    phone: driver?.phone || '+1 (555) 123-4567',
    vehicle: driver?.vehicle || '',
    plateNumber: driver?.plateNumber || 'ABC 1234'
  });
  const handleSave = () => {
    setIsEditing(false);
  };
  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">

          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white ml-2">
          Personal Details
        </h1>
        <div className="ml-auto">
          {isEditing ?
          <button
            onClick={handleSave}
            className="text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">

              Save
            </button> :

          <button
            onClick={() => setIsEditing(true)}
            className="text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-slate-900 dark:hover:text-white">

              Edit
            </button>
          }
        </div>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-lg flex items-center justify-center overflow-hidden">
            {avatarPreview ?
            <img
              src={avatarPreview}
              alt={driver?.name || 'Driver'}
              className="w-full h-full object-cover" /> :


            <User size={48} className="text-slate-400" />
            }
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setAvatarPreview(URL.createObjectURL(file));
            }}
          />
          {isEditing &&
          <button
            type="button"
            className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full text-white shadow-lg border-2 border-white dark:border-slate-800"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo">
              <Camera size={14} />
            </button>
          }
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-4">
          {driver?.name}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Driver ID: {driver?.id.toUpperCase()}
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1">
            Contact Info
          </h3>

          <GlassCard className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                Full Name
              </label>
              <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                <User size={18} className="text-slate-400 mr-3" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value
                  })
                  }
                  disabled={!isEditing}
                  className="bg-transparent text-slate-900 dark:text-white w-full focus:outline-none disabled:opacity-70" />

              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                Email Address
              </label>
              <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                <Mail size={18} className="text-slate-400 mr-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                  }
                  disabled={!isEditing}
                  className="bg-transparent text-slate-900 dark:text-white w-full focus:outline-none disabled:opacity-70" />

              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                Phone Number
              </label>
              <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                <Phone size={18} className="text-slate-400 mr-3" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value
                  })
                  }
                  disabled={!isEditing}
                  className="bg-transparent text-slate-900 dark:text-white w-full focus:outline-none disabled:opacity-70" />

              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1">
            Vehicle Info
          </h3>

          <GlassCard className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                Vehicle Model
              </label>
              <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                <Car size={18} className="text-slate-400 mr-3" />
                <input
                  type="text"
                  value={formData.vehicle}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicle: e.target.value
                  })
                  }
                  disabled={!isEditing}
                  className="bg-transparent text-slate-900 dark:text-white w-full focus:outline-none disabled:opacity-70" />

              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                License Plate
              </label>
              <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                <CreditCard size={18} className="text-slate-400 mr-3" />
                <input
                  type="text"
                  value={formData.plateNumber}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    plateNumber: e.target.value
                  })
                  }
                  disabled={!isEditing}
                  className="bg-transparent text-slate-900 dark:text-white w-full focus:outline-none disabled:opacity-70" />

              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </PageContainer>);

}