import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileCheck,
  AlertCircle,
  Clock,
  Upload,
  ChevronRight } from
'lucide-react';
import { DriverDocument } from '../types';
import { PageContainer } from '../components/ui/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { VehicleVerification } from '../components/VehicleVerification';
interface DocumentsPageProps {
  onBack: () => void;
}
export function DocumentsPage({ onBack }: DocumentsPageProps) {
  const [showVerification, setShowVerification] = useState(false);
  const documents: DriverDocument[] = [
  {
    id: '1',
    title: "Driver's License",
    status: 'VERIFIED',
    expiryDate: '2025-08-15'
  },
  {
    id: '2',
    title: 'Vehicle Insurance',
    status: 'VERIFIED',
    expiryDate: '2024-12-01'
  },
  {
    id: '3',
    title: 'Vehicle Registration',
    status: 'EXPIRED',
    expiryDate: '2023-11-20'
  },
  {
    id: '4',
    title: 'Background Check',
    status: 'PENDING',
    uploadDate: '2024-02-10'
  }];

  const getStatusColor = (status: DriverDocument['status']) => {
    switch (status) {
      case 'VERIFIED':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200/50 dark:border-emerald-800/50';
      case 'PENDING':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200/50 dark:border-amber-800/50';
      case 'EXPIRED':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200/50 dark:border-red-800/50';
      default:
        return 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };
  const getStatusIcon = (status: DriverDocument['status']) => {
    switch (status) {
      case 'VERIFIED':
        return <FileCheck size={16} />;
      case 'PENDING':
        return <Clock size={16} />;
      case 'EXPIRED':
        return <AlertCircle size={16} />;
      default:
        return <Upload size={16} />;
    }
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
          Documents
        </h1>
      </div>

      {/* Upload New Card */}
      <div className="bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 border-dashed rounded-2xl p-6 mb-8 text-center">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Upload size={24} />
        </div>
        <h3 className="text-slate-800 dark:text-white font-bold mb-1">
          Upload New Document
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Tap to scan or upload a file
        </p>
        <div className="flex gap-2 justify-center">
          <GlassButton
            variant="primary"
            className="text-sm"
            onClick={() => setShowVerification(true)}>

            Verify Vehicle
          </GlassButton>
          <GlassButton variant="secondary" className="text-sm">
            Select File
          </GlassButton>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold ml-1">
          Your Documents
        </h3>

        {documents.map((doc) =>
        <GlassCard
          key={doc.id}
          className="p-4 flex items-center justify-between group active:scale-[0.98] transition-transform cursor-pointer">

            <div className="flex items-center space-x-4">
              <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border ${getStatusColor(doc.status)}`}>

                {getStatusIcon(doc.status)}
              </div>
              <div>
                <h4 className="text-slate-800 dark:text-slate-200 font-medium">
                  {doc.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {doc.status === 'VERIFIED' && `Expires: ${doc.expiryDate}`}
                  {doc.status === 'EXPIRED' && `Expired: ${doc.expiryDate}`}
                  {doc.status === 'PENDING' && `Uploaded: ${doc.uploadDate}`}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              {doc.status === 'EXPIRED' &&
            <span className="text-xs font-bold text-red-500 dark:text-red-400 mr-3 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                  RENEW
                </span>
            }
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </GlassCard>
        )}
      </div>

      <AnimatePresence>
        {showVerification &&
        <VehicleVerification onClose={() => setShowVerification(false)} />
        }
      </AnimatePresence>
    </PageContainer>);

}