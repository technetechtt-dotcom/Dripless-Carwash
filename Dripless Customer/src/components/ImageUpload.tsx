import React, { useState, useRef } from 'react';
import { CameraIcon, XIcon, UploadIcon, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
interface ImageUploadProps {
  maxImages?: number;
  onImagesChange?: (images: string[]) => void;
  label?: string;
}
const ImageUpload: React.FC<ImageUploadProps> = ({
  maxImages = 3,
  onImagesChange,
  label = 'Upload Photos'
}) => {
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images`);
      return;
    }
    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newImages.push(e.target.result as string);
          if (newImages.length === files.length) {
            const updatedImages = [...images, ...newImages];
            setImages(updatedImages);
            onImagesChange?.(updatedImages);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange?.(updatedImages);
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
        {label}
      </label>

      <div className="grid grid-cols-3 gap-3">
        {images.map((img, index) =>
        <div
          key={index}
          className="relative aspect-square rounded-xl overflow-hidden group">

            <img
            src={img}
            alt={`Upload ${index + 1}`}
            className="w-full h-full object-cover" />

            <button
            type="button"
            onClick={() => removeImage(index)}
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors">

              <XIcon size={14} />
            </button>
          </div>
        )}

        {images.length < maxImages &&
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:text-eco-500 hover:border-eco-500 hover:bg-eco-50 dark:hover:bg-eco-900/20 transition-all">

            <CameraIcon size={24} className="mb-1" />
            <span className="text-[10px] font-bold uppercase">Add Photo</span>
          </button>
        }
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden" />


      <p className="text-xs text-slate-400 ml-1">
        Max {maxImages} images. Supported formats: JPG, PNG.
      </p>
    </div>);

};
export default ImageUpload;