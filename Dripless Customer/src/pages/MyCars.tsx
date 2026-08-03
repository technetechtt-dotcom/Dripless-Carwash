import React, { useState, Children } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CarIcon,
  PlusIcon,
  XIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  PaletteIcon } from
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
interface Car {
  id: string;
  make: string;
  model: string;
  year: string;
  color: string;
  licensePlate: string;
  isDefault: boolean;
}
const MyCars = () => {
  const navigate = useNavigate();
  const [showAddCar, setShowAddCar] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [cars, setCars] = useState<Car[]>([
  {
    id: '1',
    make: 'Toyota',
    model: 'Corolla',
    year: '2022',
    color: 'Silver',
    licensePlate: 'CA 123-456',
    isDefault: true
  },
  {
    id: '2',
    make: 'BMW',
    model: '320i',
    year: '2021',
    color: 'Black',
    licensePlate: 'GP 789-012',
    isDefault: false
  }]
  );
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: ''
  });
  const colorOptions = [
  'White',
  'Black',
  'Silver',
  'Grey',
  'Red',
  'Blue',
  'Green',
  'Navy',
  'Brown',
  'Gold'];

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: '',
      color: '',
      licensePlate: ''
    });
  };
  const handleAddCar = () => {
    if (!formData.make || !formData.model || !formData.licensePlate) {
      toast.error('Please fill in make, model, and license plate');
      return;
    }
    const newCar: Car = {
      id: `car-${Date.now()}`,
      ...formData,
      isDefault: cars.length === 0
    };
    setCars((prev) => [...prev, newCar]);
    resetForm();
    setShowAddCar(false);
    toast.success(`${formData.make} ${formData.model} added!`);
  };
  const handleUpdateCar = () => {
    if (!editingCar) return;
    setCars((prev) =>
    prev.map((c) =>
    c.id === editingCar.id ?
    {
      ...c,
      ...formData
    } :
    c
    )
    );
    resetForm();
    setEditingCar(null);
    toast.success('Car updated!');
  };
  const handleDeleteCar = (id: string) => {
    const car = cars.find((c) => c.id === id);
    setCars((prev) => prev.filter((c) => c.id !== id));
    toast.info(`${car?.make} ${car?.model} removed`);
  };
  const handleSetDefault = (id: string) => {
    setCars((prev) =>
    prev.map((c) => ({
      ...c,
      isDefault: c.id === id
    }))
    );
    toast.success('Default car updated');
  };
  const openEdit = (car: Car) => {
    setFormData({
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      licensePlate: car.licensePlate
    });
    setEditingCar(car);
  };
  const isModalOpen = showAddCar || editingCar !== null;
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
            My Cars
          </h1>
        </div>
        <motion.button
          whileTap={{
            scale: 0.9
          }}
          onClick={() => {
            resetForm();
            setShowAddCar(true);
          }}
          className="p-2.5 bg-eco-500 rounded-xl text-white shadow-md shadow-eco-500/20">

          <PlusIcon size={20} />
        </motion.button>
      </div>

      <div className="p-4 space-y-4">
        {/* Cars List */}
        {cars.length === 0 ?
        <motion.div variants={item} className="glass-card p-8 text-center">
            <div className="bg-slate-100 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CarIcon size={28} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
              No Cars Added
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Add your first car to get started
            </p>
            <motion.button
            whileTap={{
              scale: 0.96
            }}
            onClick={() => {
              resetForm();
              setShowAddCar(true);
            }}
            className="btn-primary px-6 py-2.5 text-sm">

              Add a Car
            </motion.button>
          </motion.div> :

        cars.map((car) =>
        <motion.div
          key={car.id}
          variants={item}
          className={`glass-card p-5 ${car.isDefault ? 'border-l-4 border-l-eco-500' : ''}`}>

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div
                className={`p-3 rounded-xl mr-3.5 ${car.isDefault ? 'bg-eco-100 dark:bg-eco-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>

                    <CarIcon
                  size={22}
                  className={
                  car.isDefault ?
                  'text-eco-600 dark:text-eco-400' :
                  'text-slate-500 dark:text-slate-400'
                  } />

                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">
                      {car.make} {car.model}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {car.year} • {car.color}
                    </p>
                  </div>
                </div>
                {car.isDefault &&
            <span className="bg-eco-100 dark:bg-eco-900/30 text-eco-700 dark:text-eco-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    Default
                  </span>
            }
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  License Plate
                </p>
                <p className="font-bold text-slate-800 dark:text-white font-mono tracking-wider">
                  {car.licensePlate}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                {!car.isDefault &&
            <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => handleSetDefault(car.id)}
              className="flex-1 py-2 text-xs font-bold text-eco-600 dark:text-eco-400 bg-eco-50 dark:bg-eco-900/20 rounded-lg flex items-center justify-center gap-1">

                    <CheckCircleIcon size={14} />
                    Set Default
                  </motion.button>
            }
                <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => openEdit(car)}
              className="flex-1 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center gap-1">

                  <PencilIcon size={14} />
                  Edit
                </motion.button>
                <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={() => handleDeleteCar(car.id)}
              className="py-2 px-3 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">

                  <TrashIcon size={14} />
                </motion.button>
              </div>
            </motion.div>
        )
        }

        {/* Info */}
        <motion.div
          variants={item}
          className="glass-card p-4 flex items-center border-l-4 border-l-blue-500">

          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
            <CarIcon size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Your default car will be pre-selected when booking a wash service.
          </p>
        </motion.div>
      </div>

      {/* Add/Edit Car Modal */}
      <AnimatePresence>
        {isModalOpen &&
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
            onClick={() => {
              setShowAddCar(false);
              setEditingCar(null);
              resetForm();
            }} />

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
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingCar ? 'Edit Car' : 'Add a Car'}
                </h2>
                <motion.button
                whileTap={{
                  scale: 0.9
                }}
                onClick={() => {
                  setShowAddCar(false);
                  setEditingCar(null);
                  resetForm();
                }}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">

                  <XIcon size={20} className="text-slate-500" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Make *
                    </label>
                    <input
                    type="text"
                    value={formData.make}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      make: e.target.value
                    })
                    }
                    placeholder="e.g. Toyota"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Model *
                    </label>
                    <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      model: e.target.value
                    })
                    }
                    placeholder="e.g. Corolla"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      Year
                    </label>
                    <input
                    type="text"
                    value={formData.year}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      year: e.target.value
                    })
                    }
                    placeholder="e.g. 2022"
                    maxLength={4}
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
                      License Plate *
                    </label>
                    <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      licensePlate: e.target.value.toUpperCase()
                    })
                    }
                    placeholder="e.g. CA 123-456"
                    className="w-full p-3 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none text-sm dark:text-white placeholder:text-slate-400 font-mono" />

                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 ml-1 flex items-center gap-1">
                    <PaletteIcon size={12} />
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) =>
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                    setFormData({
                      ...formData,
                      color
                    })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${formData.color === color ? 'bg-eco-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>

                        {color}
                      </button>
                  )}
                  </div>
                </div>
              </div>

              <motion.button
              whileTap={{
                scale: 0.96
              }}
              onClick={editingCar ? handleUpdateCar : handleAddCar}
              className="btn-primary w-full py-4 font-bold mt-6">

                {editingCar ? 'Update Car' : 'Add Car'}
              </motion.button>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </motion.div>);

};
export default MyCars;