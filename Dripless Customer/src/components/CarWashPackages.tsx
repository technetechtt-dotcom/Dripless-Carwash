import React, { useState } from 'react';
import { CarIcon, CheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
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
type CustomWashService = {
  id: string;
  name: string;
  price: number;
};
const CarWashPackages: React.FC<CarWashPackagesProps> = ({
  packages,
  onSelectPackage,
  selectedPackage
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'custom'>('packages');
  const [selectedCustomServices, setSelectedCustomServices] = useState<
    string[]>(
    []);
  const customWashServices: CustomWashService[] = [
  {
    id: 'window-wash',
    name: 'Window Wash',
    price: 15
  },
  {
    id: 'tire-wash',
    name: 'Tire Wash',
    price: 10
  },
  {
    id: 'engine-bay-wash',
    name: 'Engine Bay Wash',
    price: 25
  },
  {
    id: 'seats-wash',
    name: 'Seats Wash',
    price: 20
  },
  {
    id: 'seats-deep-steam-cleaning',
    name: 'Seats Deep Steam Cleaning',
    price: 35
  },
  {
    id: 'carpets-wash',
    name: 'Carpets Wash',
    price: 18
  },
  {
    id: 'carpets-deep-steam-cleaning',
    name: 'Carpets Deep Steam Cleaning',
    price: 32
  }];

  const toggleCustomService = (serviceId: string) => {
    setSelectedCustomServices((prev) =>
    prev.includes(serviceId) ?
    prev.filter((id) => id !== serviceId) :
    [...prev, serviceId]
    );
  };
  const calculateCustomTotal = () => {
    return customWashServices.
    filter((service) => selectedCustomServices.includes(service.id)).
    reduce((total, service) => total + service.price, 0);
  };
  return (
    <div className="mt-4">
      {/* Car Wash Header */}
      <div className="glass rounded-2xl p-4 mb-4 flex items-center dark:bg-slate-800/60">
        <div className="bg-eco-100 dark:bg-eco-900/30 w-16 h-16 rounded-full flex items-center justify-center mr-4">
          <CarIcon size={32} className="text-eco-600 dark:text-eco-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Carwash
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Select a package or customize your wash
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6">
        <button
          className={`py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'packages' ? 'bg-white dark:bg-slate-700 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('packages')}>

          Packages
        </button>
        <button
          className={`py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-slate-700 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('custom')}>

          Custom Wash
        </button>
      </div>

      {/* Package Options */}
      {activeTab === 'packages' &&
      <div className="space-y-4">
          {packages.map((pkg) =>
        <motion.div
          key={pkg.id}
          whileTap={{
            scale: 0.98
          }}
          className={`glass rounded-xl p-4 cursor-pointer transition-all ${selectedPackage === pkg.id ? 'border-eco-500 bg-eco-50/50 dark:bg-eco-900/20 ring-1 ring-eco-500/20' : 'hover:bg-white/80 dark:hover:bg-slate-800/60'}`}
          onClick={() => onSelectPackage(pkg.id)}>

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                    {pkg.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {pkg.description}
                  </p>
                </div>
                <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${selectedPackage === pkg.id ? 'bg-eco-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>

                  {selectedPackage === pkg.id && <CheckIcon size={14} />}
                </div>
              </div>
            </motion.div>
        )}
        </div>
      }

      {/* Custom Wash Options */}
      {activeTab === 'custom' &&
      <div className="space-y-3">
          {customWashServices.map((service) =>
        <motion.div
          key={service.id}
          whileTap={{
            scale: 0.98
          }}
          className={`glass rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${selectedCustomServices.includes(service.id) ? 'border-eco-500 bg-eco-50/50 dark:bg-eco-900/20 ring-1 ring-eco-500/20' : 'hover:bg-white/80 dark:hover:bg-slate-800/60'}`}
          onClick={() => toggleCustomService(service.id)}>

              <div className="flex items-center">
                <div
              className={`w-5 h-5 rounded flex items-center justify-center mr-3 transition-colors ${selectedCustomServices.includes(service.id) ? 'bg-eco-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>

                  {selectedCustomServices.includes(service.id) &&
              <CheckIcon size={12} />
              }
                </div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {service.name}
                </span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${service.price}
              </span>
            </motion.div>
        )}

          {/* Total Price */}
          {selectedCustomServices.length > 0 &&
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="bg-gradient-to-r from-eco-500 to-teal-600 text-white rounded-xl p-4 mt-4 shadow-lg shadow-eco-500/20">

              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold">
                  ${calculateCustomTotal()}
                </span>
              </div>
            </motion.div>
        }
        </div>
      }
    </div>);

};
export default CarWashPackages;