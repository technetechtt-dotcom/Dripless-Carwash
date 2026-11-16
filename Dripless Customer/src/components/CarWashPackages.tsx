import React from 'react';
import { CarIcon, CheckIcon, LeafIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/currency';

type CarWashPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  eco: number;
};

type CarWashPackagesProps = {
  packages: CarWashPackage[];
  onSelectPackage: (packageId: string) => void;
  selectedPackage: string;
};

const CarWashPackages: React.FC<CarWashPackagesProps> = ({ packages, onSelectPackage, selectedPackage }) => (
  <div className="mt-4">
    <div className="glass rounded-2xl p-4 mb-4 flex items-center dark:bg-slate-800/60">
      <div className="bg-eco-100 dark:bg-eco-900/30 w-16 h-16 rounded-full flex items-center justify-center mr-4"><CarIcon size={32} className="text-eco-600 dark:text-eco-400" /></div>
      <div><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Carwash</h2><p className="text-slate-500 dark:text-slate-400">Choose an available catalogue option</p></div>
    </div>
    <div className="space-y-4">
      {packages.map((pkg) => {
        const selected = selectedPackage === pkg.id;
        return <motion.button type="button" key={pkg.id} whileTap={{ scale: 0.98 }} onClick={() => onSelectPackage(pkg.id)} className={`w-full text-left glass-card p-5 border-2 ${selected ? 'border-eco-500 bg-eco-50/50 dark:bg-eco-900/20' : 'border-transparent'}`}>
          <div className="flex justify-between gap-4"><div><h3 className="font-bold text-slate-900 dark:text-white">{pkg.name}</h3><p className="text-sm text-slate-500 mt-1">{pkg.description}</p><div className="flex mt-3 gap-1" aria-label={`Eco rating ${pkg.eco} out of 5`}>{Array.from({ length: 5 }, (_, index) => <LeafIcon key={index} size={13} className={index < pkg.eco ? 'text-eco-500 fill-eco-500' : 'text-slate-300'} />)}</div></div><div className="text-right"><strong className="text-lg dark:text-white">{formatCurrency(pkg.price)}</strong>{selected ? <div className="mt-3 ml-auto w-6 h-6 rounded-full bg-eco-600 text-white flex items-center justify-center"><CheckIcon size={14} /></div> : null}</div></div>
        </motion.button>;
      })}
      {packages.length === 0 ? <div className="glass-card p-6 text-center text-slate-500">No car-wash options are currently available.</div> : null}
    </div>
  </div>
);

export default CarWashPackages;
