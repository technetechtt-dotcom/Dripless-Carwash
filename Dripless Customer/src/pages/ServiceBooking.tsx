import React, { useEffect, useMemo, useState, Children } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CreditCardIcon,
  LeafIcon,
  StarIcon,
  PlusCircleIcon,
  HeartIcon,
  CarIcon,
  PackageIcon,
  SunIcon,
  DropletIcon } from
'lucide-react';
import { motion } from 'framer-motion';
import CarWashPackages from '../components/CarWashPackages';
import CheckoutModal from '../components/CheckoutModal';
import LocationPickerMap from '../components/LocationPickerMap';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { apiRuntimeConfig, catalogApi, customerAccountApi, specialsApi } from '@shared/api';
import type { OpsSpecial, SpecialServiceScope } from '@shared/types';
import { ROUTES } from '../utils/routes';
import { formatCurrency } from '../utils/currency';
const serviceTypes = {
  'car-wash': {
    title: 'Carwash Service',
    options: [
    {
      id: 'full-valet',
      name: 'Full valet',
      description: 'Full exterior and interior cleaning.',
      price: 49.99,
      eco: 4
    },
    {
      id: 'wash-vacuum',
      name: 'Wash & Vacuum',
      description: 'Basic exterior wash and interior vacuuming.',
      price: 24.99,
      eco: 5
    },
    {
      id: 'wash-vacuum-polish',
      name: 'Wash Vacuum & Polish',
      description: 'Includes wash, vacuum, and exterior polish.',
      price: 34.99,
      eco: 4
    },
    {
      id: 'outside-only',
      name: 'Outside Only',
      description: 'Exterior wash and detailing only.',
      price: 19.99,
      eco: 5
    },
    {
      id: 'inside-only',
      name: 'Inside Only',
      description: 'Interior cleaning and vacuuming only.',
      price: 22.99,
      eco: 5
    },
    {
      id: 'wash-vacuum-polish-leather',
      name: 'Wash Vacuum Polish & Leather Care',
      description:
      'Complete service with leather conditioning and protection.',
      price: 44.99,
      eco: 4
    }]

  },
  'window-solar-clean': {
    title: 'Window & Solar Cleaning',
    options: [
    {
      id: 'standard-window',
      name: 'Standard Window Clean',
      description: 'Streak-free window cleaning, eco-friendly solutions.',
      price: 39.99,
      eco: 5
    },
    {
      id: 'standard-solar',
      name: 'Standard Solar Clean',
      description: 'Improve efficiency of your solar panels.',
      price: 49.99,
      eco: 4
    },
    {
      id: 'combo-clean',
      name: 'Complete Package',
      description: 'Both window and solar panel cleaning.',
      price: 79.99,
      eco: 4
    },
    {
      id: 'advanced-solar',
      name: 'Advanced Solar Clean',
      description: 'Deep clean and performance check for solar panels.',
      price: 69.99,
      eco: 4
    }]

  },
  'mattress-cleaning': {
    title: 'Mattress Cleaning',
    options: [
    {
      id: 'single-mattress',
      name: 'Single Mattress',
      description: 'Deep clean and sanitize single mattress.',
      price: 59.99,
      eco: 5
    },
    {
      id: 'double-queen-mattress',
      name: 'Double/Queen Mattress',
      description: 'Deep clean and sanitize double or queen mattress.',
      price: 79.99,
      eco: 5
    },
    {
      id: 'king-mattress',
      name: 'King Mattress',
      description: 'Deep clean and sanitize king mattress.',
      price: 99.99,
      eco: 5
    },
    {
      id: 'deep-sanitization',
      name: 'Deep Sanitization Package',
      description:
      'Includes steam cleaning, allergen removal, and deodorizing.',
      price: 129.99,
      eco: 5
    }]

  },
  'couch-cleaning': {
    title: 'Couch Cleaning',
    options: [
    {
      id: 'two-seater',
      name: '2-Seater Couch',
      description: 'Deep clean and refresh 2-seater couch.',
      price: 89.99,
      eco: 5
    },
    {
      id: 'three-seater',
      name: '3-Seater Couch',
      description: 'Deep clean and refresh 3-seater couch.',
      price: 119.99,
      eco: 5
    },
    {
      id: 'l-shaped-sectional',
      name: 'L-Shaped Sectional',
      description: 'Deep clean and refresh L-shaped sectional.',
      price: 159.99,
      eco: 4
    },
    {
      id: 'full-upholstery',
      name: 'Full Upholstery Treatment',
      description:
      'Includes stain removal, fabric protection, and deodorizing.',
      price: 199.99,
      eco: 5
    }]

  },
  'carpet-cleaning': {
    title: 'Carpet Cleaning',
    options: [
    {
      id: 'small-room',
      name: 'Small Room',
      description: 'Up to 150 sq ft, deep clean and stain removal.',
      price: 69.99,
      eco: 5
    },
    {
      id: 'medium-room',
      name: 'Medium Room',
      description: '150-300 sq ft, deep clean and stain removal.',
      price: 99.99,
      eco: 5
    },
    {
      id: 'large-room',
      name: 'Large Room',
      description: '300+ sq ft, deep clean and stain removal.',
      price: 139.99,
      eco: 4
    },
    {
      id: 'stain-removal',
      name: 'Advanced Stain Removal',
      description: 'Specialized treatment for tough stains and odors.',
      price: 179.99,
      eco: 5
    }]

  },
  taxi: {
    title: 'Eco Taxi',
    options: [
    {
      id: 'hybrid',
      name: 'Hybrid Vehicle',
      description: 'Balanced comfort and cost using lower-emission hybrid rides.',
      price: 12.99,
      eco: 4
    },
    {
      id: 'electric',
      name: 'Electric Vehicle',
      description: 'Zero tailpipe emissions with quieter premium ride comfort.',
      price: 14.99,
      eco: 5
    }]

  },
  delivery: {
    title: 'Parcel Delivery',
    options: [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: 'Economy parcel delivery with reliable same-day handling.',
      price: 9.99,
      eco: 3
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: 'Priority dispatch for urgent parcels and tighter ETA windows.',
      price: 14.99,
      eco: 3
    },
    {
      id: 'green',
      name: 'Green Route Delivery',
      description: 'Optimized low-emission routing with pooled eco-friendly delivery.',
      price: 12.99,
      eco: 5
    }]

  }
};
type CatalogService = {
  slug: string;
  name: string;
  description?: string | null;
  options: Array<{
    id: string;
    slug: string;
    name: string;
    basePriceZar: number;
    ecoPointsAward: number;
  }>;
};
type FavoriteLocation = {
  id: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
};
const ServiceBooking = () => {
  const { service } = useParams();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showFavoritePickup, setShowFavoritePickup] = useState(false);
  const [showFavoriteDestination, setShowFavoriteDestination] = useState(false);
  const [fareEstimate, setFareEstimate] = useState({
    min: 0,
    max: 0
  });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [windowQuantity, setWindowQuantity] = useState(0);
  const [windowSizesSqm, setWindowSizesSqm] = useState<number[]>([]);
  const [solarPanelQuantity, setSolarPanelQuantity] = useState(0);
  const [solarPanelSizesSqm, setSolarPanelSizesSqm] = useState<number[]>([]);
  const [availableSpecials, setAvailableSpecials] = useState<OpsSpecial[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedSpecial, setAppliedSpecial] = useState<OpsSpecial | null>(null);
  const [promoError, setPromoError] = useState('');
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const serviceData = useMemo(() => {
    const live = catalogServices.find((entry) => entry.slug === service);
    if (live) {
      return {
        title: live.name,
        options: live.options.map((option) => ({
          id: option.slug,
          name: option.name,
          description: live.description || option.name,
          price: option.basePriceZar,
          eco: Math.max(1, Math.min(5, Math.round(option.ecoPointsAward / 100)))
        }))
      };
    }
    if (apiRuntimeConfig.isMockEnabled()) {
      return serviceTypes[service as keyof typeof serviceTypes] ?? { title: 'Service not found', options: [] };
    }
    return { title: 'Service unavailable', options: [] };
  }, [catalogServices, service]);
  const getSelectedOptionDetails = () => {
    if (!serviceData) return null;
    return (
      serviceData.options.find((option) => option.id === selectedOption) || null);

  };
  useEffect(() => {
    let cancelled = false;
    void Promise.all([catalogApi.services(), customerAccountApi.addresses()])
      .then(([services, addresses]) => {
        if (cancelled) return;
        setCatalogServices(services as CatalogService[]);
        setFavoriteLocations(addresses.map((row) => ({
          id: String(row.id),
          name: String(row.label),
          address: [row.line1, row.city].filter(Boolean).join(', '),
          lat: typeof row.lat === 'number' ? row.lat : null,
          lng: typeof row.lng === 'number' ? row.lng : null
        })));
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogServices([]);
          setFavoriteLocations([]);
        }
      });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!serviceData) return;
    if (service === 'taxi' || service === 'delivery') {
      if (pickupAddress && destinationAddress && selectedOption) {
        const option =
          serviceData.options.find((item) => item.id === selectedOption) || null;
        if (option) {
          const basePrice = option.price;
          setFareEstimate({
            min: Math.floor(basePrice - 2),
            max: Math.ceil(basePrice + 5)
          });
        }
      }
    }
  }, [pickupAddress, destinationAddress, selectedOption, service, serviceData]);
  useEffect(() => {
    let cancelled = false;
    const loadSpecials = async () => {
      try {
        const specials = await specialsApi.listVisibleSpecials('customer');
        if (!cancelled) {
          setAvailableSpecials(specials);
        }
      } catch {
        if (!cancelled) {
          setAvailableSpecials([]);
        }
      }
    };
    void loadSpecials();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidWindowSolarMeasurements()) {
      window.alert(
        'Please enter valid quantity details for windows and/or solar panels to determine pricing.'
      );
      return;
    }
    if (isCarWash) {
      setShowCheckoutModal(true);
      return;
    }
    proceedToConfirmation();
  };
  const proceedToConfirmation = (paymentMethod: 'ozow' | 'wallet' = 'ozow') => {
    const computedPrice = finalCalculatedPrice;
    const bookingDetails = {
      service: serviceData.title,
      option: selectedOptionDetails?.name || '',
      price: computedPrice,
      basePrice: baseCalculatedPrice,
      specialDiscountAmount,
      appliedSpecial:
        appliedSpecial ?
        {
          id: appliedSpecial.id,
          promoCode: appliedSpecial.promoCode,
          title: appliedSpecial.title
        } :
        null,
      date,
      time,
      location: pickupAddress || 'Your location',
      pickupCoordinates,
      destinationLocation:
      service === 'taxi' || service === 'delivery' ?
      destinationAddress :
      null,
      destinationCoordinates:
      service === 'taxi' || service === 'delivery' ?
      destinationCoordinates :
      null,
      paymentMethod,
      fareEstimate: fareEstimate,
      measurementDetails: isWindowSolarService ?
      {
        windowQuantity,
        windowSizesSqm: resizeSizeList(windowSizesSqm, windowQuantity, 1.5),
        solarPanelQuantity,
        solarPanelSizesSqm: resizeSizeList(solarPanelSizesSqm, solarPanelQuantity, 1.9)
      } :
      undefined
    };
    if (service === 'taxi') {
      navigate(ROUTES.RIDE_DETAILS, {
        state: {
          bookingDetails
        }
      });
    } else if (service === 'delivery') {
      navigate(ROUTES.DELIVERY_DETAILS, {
        state: {
          bookingDetails
        }
      });
    } else {
      navigate(ROUTES.BOOKING_CONFIRMATION, {
        state: {
          bookingDetails
        }
      });
    }
  };
  const handleCheckoutConfirm = (paymentMethod: 'ozow' | 'wallet') => {
    setShowCheckoutModal(false);
    proceedToConfirmation(paymentMethod);
  };
  const addToFavorites = async (address: string) => {
    const name = `Favorite ${favoriteLocations.length + 1}`;
    const row = await customerAccountApi.createAddress({ label: name, line1: address, isDefault: false });
    setFavoriteLocations((current) => [{
      id: String(row.id),
      name: String(row.label),
      address: [row.line1, row.city].filter(Boolean).join(', '),
      lat: typeof row.lat === 'number' ? row.lat : null,
      lng: typeof row.lng === 'number' ? row.lng : null
    }, ...current]);
  };
  const selectFavoriteLocation = (address: string, isPickup: boolean) => {
    const favorite = favoriteLocations.find((entry) => entry.address === address);
    const coordinates = favorite?.lat != null && favorite.lng != null ? { lat: favorite.lat, lng: favorite.lng } : null;
    if (isPickup) {
      setPickupAddress(address);
      setPickupCoordinates(coordinates);
      setShowFavoritePickup(false);
    } else {
      setDestinationAddress(address);
      setDestinationCoordinates(coordinates);
      setShowFavoriteDestination(false);
    }
  };
  const resizeSizeList = (sizes: number[], quantity: number, defaultSize: number) => {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    if (safeQuantity === 0) return [];
    if (sizes.length === safeQuantity) return sizes;
    if (sizes.length > safeQuantity) return sizes.slice(0, safeQuantity);
    return [...sizes, ...Array.from({ length: safeQuantity - sizes.length }, () => defaultSize)];
  };
  const handleWindowQuantityChange = (nextQuantity: number) => {
    const safeQuantity = Math.max(0, Math.floor(Number(nextQuantity) || 0));
    setWindowQuantity(safeQuantity);
    setWindowSizesSqm((current) => resizeSizeList(current, safeQuantity, 1.5));
  };
  const handleSolarQuantityChange = (nextQuantity: number) => {
    const safeQuantity = Math.max(0, Math.floor(Number(nextQuantity) || 0));
    setSolarPanelQuantity(safeQuantity);
    setSolarPanelSizesSqm((current) => resizeSizeList(current, safeQuantity, 1.9));
  };
  const updateWindowSize = (index: number, value: number) => {
    const safeValue = Math.max(0.1, Number(value) || 0.1);
    setWindowSizesSqm((current) => current.map((size, idx) => idx === index ? safeValue : size));
  };
  const updateSolarPanelSize = (index: number, value: number) => {
    const safeValue = Math.max(0.1, Number(value) || 0.1);
    setSolarPanelSizesSqm((current) => current.map((size, idx) => idx === index ? safeValue : size));
  };
  const needsPickupAndDelivery = service === 'delivery' || service === 'taxi';
  const isCarWash = service === 'car-wash';
  const isWindowSolarService = service === 'window-solar-clean';
  const selectedOptionDetails = getSelectedOptionDetails();
  const toSpecialScope = (serviceKey?: string): SpecialServiceScope => {
    switch (serviceKey) {
      case 'car-wash':
        return 'CAR_WASH';
      case 'window-solar-clean':
        return 'WINDOW_SOLAR';
      case 'mattress-cleaning':
        return 'MATTRESS';
      case 'couch-cleaning':
        return 'COUCH';
      case 'carpet-cleaning':
        return 'CARPET';
      case 'taxi':
        return 'RIDE';
      case 'delivery':
        return 'DELIVERY';
      default:
        return 'ALL';
    }
  };
  const isSpecialApplicable = (special: OpsSpecial) =>
    special.serviceScope === 'ALL' || special.serviceScope === toSpecialScope(service);
  const calculateWindowSolarPrice = () => {
    if (!isWindowSolarService || !selectedOptionDetails) {
      return selectedOptionDetails?.price || 0;
    }
    const safeWindowQty = Math.max(0, Number(windowQuantity) || 0);
    const safeSolarQty = Math.max(0, Number(solarPanelQuantity) || 0);
    const activeWindowSizes = resizeSizeList(windowSizesSqm, safeWindowQty, 1.5);
    const activeSolarSizes = resizeSizeList(solarPanelSizesSqm, safeSolarQty, 1.9);
    const windowSurface = activeWindowSizes.reduce((sum, size) => sum + Math.max(0, Number(size) || 0), 0);
    const solarSurface = activeSolarSizes.reduce((sum, size) => sum + Math.max(0, Number(size) || 0), 0);
    const windowRatePerSqm = 6;
    const solarRatePerSqm = 8;
    let measuredPrice = selectedOptionDetails.price;
    switch (selectedOptionDetails.id) {
      case 'standard-window':
        measuredPrice += windowSurface * windowRatePerSqm;
        break;
      case 'standard-solar':
        measuredPrice += solarSurface * solarRatePerSqm;
        break;
      case 'combo-clean':
        measuredPrice += windowSurface * windowRatePerSqm + solarSurface * solarRatePerSqm;
        break;
      case 'advanced-solar':
        measuredPrice += solarSurface * solarRatePerSqm * 1.35 + safeSolarQty * 4;
        break;
      default:
        break;
    }
    return Number(measuredPrice.toFixed(2));
  };
  const hasValidWindowSolarMeasurements = () => {
    if (!isWindowSolarService || !selectedOptionDetails) return true;
    const safeWindowQty = Math.max(0, Number(windowQuantity) || 0);
    const safeSolarQty = Math.max(0, Number(solarPanelQuantity) || 0);
    const activeWindowSizes = resizeSizeList(windowSizesSqm, safeWindowQty, 1.5);
    const activeSolarSizes = resizeSizeList(solarPanelSizesSqm, safeSolarQty, 1.9);
    const hasValidWindowSizes = activeWindowSizes.length === safeWindowQty && activeWindowSizes.every((size) => Number(size) > 0);
    const hasValidSolarSizes = activeSolarSizes.length === safeSolarQty && activeSolarSizes.every((size) => Number(size) > 0);
    if (selectedOptionDetails.id === 'standard-window') return safeWindowQty > 0 && hasValidWindowSizes;
    if (selectedOptionDetails.id === 'standard-solar' || selectedOptionDetails.id === 'advanced-solar') {
      return safeSolarQty > 0 && hasValidSolarSizes;
    }
    if (selectedOptionDetails.id === 'combo-clean') {
      return safeWindowQty > 0 && safeSolarQty > 0 && hasValidWindowSizes && hasValidSolarSizes;
    }
    return true;
  };
  const baseCalculatedPrice = isWindowSolarService ?
    calculateWindowSolarPrice() :
    selectedOptionDetails?.price || 0;
  const getSpecialDiscountAmount = (basePrice: number, special: OpsSpecial | null) => {
    if (!special || !isSpecialApplicable(special)) return 0;
    if (special.discountType === 'PERCENT') {
      return Math.min(basePrice, Number((basePrice * (special.discountValue / 100)).toFixed(2)));
    }
    return Math.min(basePrice, special.discountValue);
  };
  const specialDiscountAmount = getSpecialDiscountAmount(baseCalculatedPrice, appliedSpecial);
  const finalCalculatedPrice = Number(
    Math.max(0, baseCalculatedPrice - specialDiscountAmount).toFixed(2)
  );
  const applyPromoCode = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code.');
      return;
    }
    if (!selectedOptionDetails) {
      setPromoError('Select a service option before applying a promo code.');
      return;
    }
    const match = availableSpecials.find((special) => special.promoCode === code);
    if (!match) {
      setPromoError('Promo code not found or not active.');
      setAppliedSpecial(null);
      return;
    }
    if (!isSpecialApplicable(match)) {
      setPromoError('Promo code is not valid for this service.');
      setAppliedSpecial(null);
      return;
    }
    setAppliedSpecial(match);
    setPromoCodeInput(match.promoCode);
    setPromoError('');
  };
  useEffect(() => {
    if (!appliedSpecial) return;
    if (!isSpecialApplicable(appliedSpecial)) {
      setAppliedSpecial(null);
      setPromoError('Applied special no longer matches your selected service.');
    }
  }, [appliedSpecial, service, selectedOption]);
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <motion.button
            whileTap={{
              scale: 0.9
            }}
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full glass hover:bg-white/50 dark:hover:bg-slate-800/50">

            <ArrowLeftIcon
              size={20}
              className="text-slate-700 dark:text-slate-200" />

          </motion.button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {serviceData.title}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Service Selection */}
        <motion.div variants={itemVariants}>
          {isCarWash ?
          <CarWashPackages
            packages={serviceData.options}
            onSelectPackage={setSelectedOption}
            selectedPackage={selectedOption} /> :


          <div className="space-y-4">
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                Select Service Type
              </label>
              <div className="space-y-3">
                {serviceData.options.map((option) =>
              <motion.div
                key={option.id}
                whileTap={{
                  scale: 0.98
                }}
                className={`glass-card p-4 cursor-pointer border-l-4 transition-all ${selectedOption === option.id ? 'border-l-eco-500 bg-eco-50/50 dark:bg-eco-900/20' : 'border-l-transparent'}`}
                onClick={() => setSelectedOption(option.id)}>

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                          {option.name}
                        </h3>
                        {option.description &&
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {option.description}
                          </p>
                    }
                        <div className="flex mt-2 items-center">
                          <div className="flex mr-2">
                            {[...Array(5)].map((_, i) =>
                        <LeafIcon
                          key={i}
                          size={12}
                          className={
                          i < option.eco ?
                          'text-eco-500 fill-eco-500' :
                          'text-slate-300 dark:text-slate-600'
                          } />

                        )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                            Eco Rating
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(option.price)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
              )}
              </div>
              {isWindowSolarService &&
            <motion.div
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="glass-card p-4 space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    Measurement & Quantity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add quantity and each item size so mixed dimensions are priced accurately.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Window quantity
                      <input
                      type="number"
                      min={0}
                      step={1}
                      value={windowQuantity}
                      onChange={(e) => handleWindowQuantityChange(Number(e.target.value))}
                      className="mt-1 w-full p-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Solar panel quantity
                      <input
                      type="number"
                      min={0}
                      step={1}
                      value={solarPanelQuantity}
                      onChange={(e) => handleSolarQuantityChange(Number(e.target.value))}
                      className="mt-1 w-full p-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </label>
                  </div>
                  {windowQuantity > 0 &&
                <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Window sizes (sqm)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {resizeSizeList(windowSizesSqm, windowQuantity, 1.5).map((size, index) =>
                    <label
                      key={`window-size-${index}`}
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Window {index + 1}
                            <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={size}
                        onChange={(e) => updateWindowSize(index, Number(e.target.value))}
                        className="mt-1 w-full p-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                          </label>
                    )}
                      </div>
                    </div>
                }
                  {solarPanelQuantity > 0 &&
                <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Solar panel sizes (sqm)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {resizeSizeList(solarPanelSizesSqm, solarPanelQuantity, 1.9).map((size, index) =>
                    <label
                      key={`solar-size-${index}`}
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Panel {index + 1}
                            <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={size}
                        onChange={(e) => updateSolarPanelSize(index, Number(e.target.value))}
                        className="mt-1 w-full p-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                          </label>
                    )}
                      </div>
                    </div>
                }
                  {selectedOptionDetails &&
                <div className="bg-eco-50/60 dark:bg-eco-900/20 border border-eco-200/60 dark:border-eco-700/40 rounded-lg p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Estimated price for <strong>{selectedOptionDetails.name}</strong>
                      </p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        {formatCurrency(calculateWindowSolarPrice())}
                      </p>
                    </div>
                }
                </motion.div>
            }
            </div>
          }
        </motion.div>

        {/* Date & Time */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required />

              <CalendarIcon
                size={18}
                className="absolute left-3.5 top-4 text-slate-400" />

            </div>
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required />

              <ClockIcon
                size={18}
                className="absolute left-3.5 top-4 text-slate-400" />

            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div variants={itemVariants}>
          {needsPickupAndDelivery ?
          <div className="space-y-4">
              {/* Pickup Address */}
              <div className="relative">
                <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                  Pickup Address
                </label>
                <div className="relative">
                  <AddressAutocomplete
                    value={pickupAddress}
                    placeholder="Enter pickup address"
                    inputClassName="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-20 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
                    onChange={(next) => {
                      setPickupAddress(next);
                      setPickupCoordinates(null);
                    }}
                    onSelect={(suggestion) => {
                      setPickupAddress(suggestion.label);
                      if (suggestion.lat != null && suggestion.lng != null) {
                        setPickupCoordinates({ lat: suggestion.lat, lng: suggestion.lng });
                      }
                    }}
                  />

                  <MapPinIcon
                  size={18}
                  className="absolute left-3.5 top-4 text-slate-400 pointer-events-none" />

                  <div className="absolute right-3 top-3 flex space-x-1">
                    <button
                    type="button"
                    onClick={() => setShowFavoritePickup(!showFavoritePickup)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-amber-500">

                      <StarIcon size={18} />
                    </button>
                    {pickupAddress &&
                  <button
                    type="button"
                    onClick={() => void addToFavorites(pickupAddress)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-500">

                        <HeartIcon size={18} />
                      </button>
                  }
                  </div>
                </div>

                {/* Favorites Dropdown */}
                {showFavoritePickup &&
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                className="absolute z-10 mt-2 w-full glass rounded-xl shadow-xl overflow-hidden">

                    {favoriteLocations.map((location) =>
                <div
                  key={location.id}
                  className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() =>
                  selectFavoriteLocation(location.address, true)
                  }>

                        <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mr-3">
                          <StarIcon
                      size={16}
                      className="text-amber-500 fill-amber-500" />

                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {location.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {location.address}
                          </p>
                        </div>
                      </div>
                )}
                  </motion.div>
              }
              </div>

              {/* Destination Address */}
              <div className="relative">
                <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                  {service === 'taxi' ?
                'Destination Address' :
                'Delivery Address'}
                </label>
                <div className="relative">
                  <AddressAutocomplete
                    value={destinationAddress}
                    placeholder={
                      service === 'taxi' ? 'Enter destination' : 'Enter delivery address'
                    }
                    inputClassName="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-20 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
                    onChange={(next) => {
                      setDestinationAddress(next);
                      setDestinationCoordinates(null);
                    }}
                    onSelect={(suggestion) => {
                      setDestinationAddress(suggestion.label);
                      if (suggestion.lat != null && suggestion.lng != null) {
                        setDestinationCoordinates({ lat: suggestion.lat, lng: suggestion.lng });
                      }
                    }}
                  />

                  <MapPinIcon
                  size={18}
                  className="absolute left-3.5 top-4 text-slate-400 pointer-events-none" />

                  <div className="absolute right-3 top-3 flex space-x-1">
                    <button
                    type="button"
                    onClick={() =>
                    setShowFavoriteDestination(!showFavoriteDestination)
                    }
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-amber-500">

                      <StarIcon size={18} />
                    </button>
                    {destinationAddress &&
                  <button
                    type="button"
                    onClick={() => void addToFavorites(destinationAddress)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-500">

                        <HeartIcon size={18} />
                      </button>
                  }
                  </div>
                </div>

                {/* Favorites Dropdown */}
                {showFavoriteDestination &&
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                className="absolute z-10 mt-2 w-full glass rounded-xl shadow-xl overflow-hidden">

                    {favoriteLocations.map((location) =>
                <div
                  key={location.id}
                  className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() =>
                  selectFavoriteLocation(location.address, false)
                  }>

                        <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mr-3">
                          <StarIcon
                      size={16}
                      className="text-amber-500 fill-amber-500" />

                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {location.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {location.address}
                          </p>
                        </div>
                      </div>
                )}
                  </motion.div>
              }
              </div>

              {/* Fare Estimate */}
              {pickupAddress && destinationAddress && selectedOption &&
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              className="glass p-4 rounded-xl border-l-4 border-l-eco-500">

                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {service === 'taxi' ? 'Fare Estimate' : 'Delivery Fee'}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(fareEstimate.min)} -{' '}
                      {formatCurrency(fareEstimate.max)}
                    </span>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                      Estimated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {service === 'taxi' ?
                'Final fare may vary based on traffic and wait time' :
                'Final fee may vary based on package size and distance'}
                  </p>
                </motion.div>
            }
              <LocationPickerMap
                pickup={pickupCoordinates}
                destination={destinationCoordinates}
                needsDestination={needsPickupAndDelivery}
                onPickupChange={(point) => {
                  setPickupCoordinates(point);
                  setPickupAddress(
                    `Pinned pickup (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`
                  );
                }}
                onDestinationChange={(point) => {
                  setDestinationCoordinates(point);
                  setDestinationAddress(
                    `Pinned destination (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`
                  );
                }}
              />
            </div> :

          <div className="relative">
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                Location
              </label>
              <div className="relative">
                <AddressAutocomplete
                  value={pickupAddress}
                  placeholder="Enter your address"
                  inputClassName="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-20 focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
                  onChange={(next) => {
                    setPickupAddress(next);
                    setPickupCoordinates(null);
                  }}
                  onSelect={(suggestion) => {
                    setPickupAddress(suggestion.label);
                    if (suggestion.lat != null && suggestion.lng != null) {
                      setPickupCoordinates({ lat: suggestion.lat, lng: suggestion.lng });
                    }
                  }}
                />

                <MapPinIcon
                size={18}
                className="absolute left-3.5 top-4 text-slate-400 pointer-events-none" />

                <div className="absolute right-3 top-3 flex space-x-1">
                  <button
                  type="button"
                  onClick={() => setShowFavoritePickup(!showFavoritePickup)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-amber-500">

                    <StarIcon size={18} />
                  </button>
                  {pickupAddress &&
                <button
                  type="button"
                  onClick={() => void addToFavorites(pickupAddress)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-500">

                      <HeartIcon size={18} />
                    </button>
                }
                </div>
              </div>

              {/* Favorites Dropdown */}
              {showFavoritePickup &&
            <motion.div
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              className="absolute z-10 mt-2 w-full glass rounded-xl shadow-xl overflow-hidden">

                  {favoriteLocations.map((location) =>
              <div
                key={location.id}
                className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() =>
                selectFavoriteLocation(location.address, true)
                }>

                      <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mr-3">
                        <StarIcon
                    size={16}
                    className="text-amber-500 fill-amber-500" />

                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {location.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {location.address}
                        </p>
                      </div>
                    </div>
              )}
                </motion.div>
            }
              <LocationPickerMap
                pickup={pickupCoordinates}
                destination={null}
                needsDestination={false}
                onPickupChange={(point) => {
                  setPickupCoordinates(point);
                  setPickupAddress(
                    `Pinned location (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`
                  );
                }}
                onDestinationChange={setDestinationCoordinates}
              />
            </div>
          }
        </motion.div>

        {/* Promo Code */}
        <motion.div variants={itemVariants} className="space-y-3">
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-1 ml-1">
            Promo / Special Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCodeInput}
              onChange={(e) => {
                setPromoCodeInput(e.target.value.toUpperCase());
                if (appliedSpecial && e.target.value.toUpperCase() !== appliedSpecial.promoCode) {
                  setAppliedSpecial(null);
                }
                if (promoError) setPromoError('');
              }}
              placeholder="Enter code"
              className="flex-1 p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-eco-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400 font-mono tracking-wider"
            />
            <button type="button" className="btn-primary px-4" onClick={applyPromoCode}>
              Apply
            </button>
          </div>
          {promoError ? (
            <p className="text-xs text-red-500">{promoError}</p>
          ) : null}
          {appliedSpecial ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Applied: {appliedSpecial.title} ({appliedSpecial.promoCode})
            </p>
          ) : null}
          {selectedOptionDetails ? (
            <div className="glass-card p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Base price</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(baseCalculatedPrice)}
                </span>
              </div>
              {specialDiscountAmount > 0 ? (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-emerald-700 dark:text-emerald-400">Special discount</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    -{formatCurrency(specialDiscountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <span className="text-slate-700 dark:text-slate-200 font-bold">Final price</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(finalCalculatedPrice)}
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Payment Method */}
        <motion.div variants={itemVariants}>
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
            Payment Method
          </label>
          <div className="relative">
            <div className="w-full p-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl pl-11 dark:text-white">
              Secure card payment via Paystack
            </div>
            <CreditCardIcon
              size={18}
              className="absolute left-3.5 top-4 text-slate-400" />

          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants} className="pt-4">
          <motion.button
            whileTap={{
              scale: 0.96
            }}
            type="submit"
            className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-eco-500/20"
            disabled={
            needsPickupAndDelivery && (
            !pickupAddress || !destinationAddress || !selectedOption) ||
            !needsPickupAndDelivery && !selectedOption ||
            !hasValidWindowSolarMeasurements()
            }>

            {isCarWash ?
            'Continue' :
            service === 'taxi' ?
            'Request Ride' :
            service === 'delivery' ?
            'Schedule Delivery' :
            'Book Now'}
          </motion.button>
        </motion.div>
      </form>

      {/* Checkout Modal */}
      {isCarWash &&
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onConfirm={handleCheckoutConfirm}
        selectedPackage={
        selectedOption ?
        {
          name: getSelectedOptionDetails()?.name || '',
          price: finalCalculatedPrice
        } :
        undefined
        }
        date={date}
        time={time}
        location={pickupAddress} />

      }
    </motion.div>);

};
export default ServiceBooking;
