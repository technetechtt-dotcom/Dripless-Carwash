import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAccountApi } from '@shared/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  CameraIcon } from
'lucide-react';
const PersonalInformation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    zipCode: '',
    country: 'South Africa'
  });
  const [addressId, setAddressId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    void customerAccountApi.profile().then((profile) => {
      const name = String(profile.name || '').trim().split(/\s+/);
      const addresses = (profile.addresses || []) as Array<Record<string, unknown>>;
      const address = addresses.find((item) => item.isDefault) || addresses[0];
      setAddressId(address ? String(address.id) : null);
      setFormData({
        firstName: name.shift() || '',
        lastName: name.join(' '),
        email: String(profile.email || user?.email || ''),
        phone: String(profile.phone || ''),
        address: String(address?.line1 || ''),
        city: String(address?.city || ''),
        zipCode: String(address?.postalCode || ''),
        country: 'South Africa'
      });
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load profile'));
  }, [user?.email]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerAccountApi.updateProfile({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone
      });
      if (formData.address.trim()) {
        const payload = {
          label: 'Home',
          line1: formData.address,
          city: formData.city,
          postalCode: formData.zipCode,
          isDefault: true
        };
        if (addressId) await customerAccountApi.updateAddress(addressId, payload);
        else {
          const created = await customerAccountApi.createAddress(payload);
          setAddressId(String(created.id));
        }
      }
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile');
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 pt-6 pb-6 px-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeftIcon size={24} />
            </button>
            <h1 className="text-2xl font-bold">Personal Information</h1>
          </div>
          {!isEditing &&
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium">

              Edit
            </button>
          }
        </div>
      </div>
      {/* Profile Picture */}
      <div className="flex justify-center -mt-12 mb-6">
        <div className="relative">
          <div className="bg-white p-2 rounded-full shadow-lg">
            <div className="bg-teal-100 p-8 rounded-full overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-12 h-12 object-cover rounded-full" />
              ) : (
                <UserIcon size={48} className="text-teal-600" />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setAvatarPreview(url);
            }}
          />
          {isEditing &&
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-teal-500 p-2 rounded-full shadow-lg"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo">
              <CameraIcon size={18} className="text-white" />
            </button>
          }
        </div>
      </div>
      <form onSubmit={handleSubmit} className="px-4">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600" />

              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600" />

              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg pl-10 disabled:bg-gray-50 disabled:text-gray-600" />

                <MailIcon
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400" />

              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg pl-10 disabled:bg-gray-50 disabled:text-gray-600" />

                <PhoneIcon
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400" />

              </div>
            </div>
          </div>
        </div>
        {/* Address Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-4">Address Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Street Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg pl-10 disabled:bg-gray-50 disabled:text-gray-600" />

                <MapPinIcon
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400" />

              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600" />

              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600" />

              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600" />

            </div>
          </div>
        </div>
        {/* Action Buttons */}
        {isEditing &&
        <div className="grid grid-cols-2 gap-3 pb-6">
            <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="py-4 bg-gray-200 rounded-lg font-medium">

              Cancel
            </button>
            <button
            type="submit"
            className="py-4 bg-teal-500 text-white rounded-lg font-medium">

              Save Changes
            </button>
          </div>
        }
      </form>
    </div>);

};
export default PersonalInformation;
