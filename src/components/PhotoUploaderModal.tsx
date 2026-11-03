import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Upload, X, ZoomIn, ZoomOut, AlertTriangle, Check, Trash2, Camera } from 'lucide-react';

interface PhotoUploaderProps {
  currentPhotoDataUrl: string;
  onPhotoChange: (dataUrl: string) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  // High-definition 35:45 passport portrait output (e.g., 420x540 px) keeping under Firestore document size limits
  const targetWidth = 420;
  const targetHeight = 540;
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  currentPhotoDataUrl,
  onPhotoChange
}) => {
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolutionWarning, setResolutionWarning] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setResolutionWarning(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate JPG / PNG
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setErrorMsg('Sirf JPG ya PNG format ki photo upload karein.');
      return;
    }

    // Validate max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Photo ka size 5MB se kam hona chahiye.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 300 || img.height < 300) {
          setResolutionWarning(
            `Photo resolution (${img.width}x${img.height}px) minimum recommended 300x300px se kam hai. Print quality thori dhundli ho sakti hai.`
          );
        }
        setRawImageSrc(result);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setIsCropModalOpen(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      onPhotoChange(croppedDataUrl);
      setIsCropModalOpen(false);
    } catch {
      setErrorMsg('Photo crop karne mein masla aaya. Dobara koshish karein.');
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* 35x45mm Ratio Preview Slot */}
        <div
          className="relative shrink-0 bg-white border border-slate-300 rounded-md overflow-hidden flex items-center justify-center shadow-xs"
          style={{ width: '70px', height: '90px' }}
        >
          {currentPhotoDataUrl ? (
            <img
              src={currentPhotoDataUrl}
              alt="CV Passport Portrait"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
              <Camera className="w-5 h-5 mb-1 text-slate-400" />
              <span className="text-[10px] font-mono leading-tight">35×45mm</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>{currentPhotoDataUrl ? 'Change Photo' : 'Upload Passport Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {currentPhotoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  onPhotoChange('');
                  setResolutionWarning(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Behtar nateeje ke liye blue/white background wali passport-size photo upload karein.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            JPG/PNG · Max 5MB · Min 300×300px · 35×45mm aspect ratio (No AI alteration)
          </p>

          {errorMsg && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resolutionWarning && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{resolutionWarning}</span>
            </div>
          )}
        </div>
      </div>

      {/* Crop Modal using react-easy-crop */}
      {isCropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Crop Passport Photo (35×45mm Ratio)
                </h3>
                <p className="text-xs text-slate-500">
                  Drag to position and use slider to zoom. Original photo quality is preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resolutionWarning && (
              <div className="mx-5 mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{resolutionWarning}</span>
              </div>
            )}

            <div className="relative w-full h-80 bg-slate-950 my-3">
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={35 / 45}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-slate-500" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-mono text-slate-600 w-12 text-right tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply 35×45mm Crop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
