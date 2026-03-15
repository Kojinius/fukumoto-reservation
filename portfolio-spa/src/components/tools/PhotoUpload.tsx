/**
 * 写真D&D + クロップ + base64出力
 * drag-drop-upload スキル + react-easy-crop 使用
 */
import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { cn } from '@/utils/cn';

interface PhotoUploadProps {
  value: string | null;
  onChange: (base64: string | null) => void;
  /** 出力幅 (px) */
  width?: number;
  /** 出力高さ (px) */
  height?: number;
}

/** canvas でクロップ画像を生成（PDF印刷品質のため4倍解像度で出力） */
const PHOTO_SCALE = 4;
async function getCroppedImg(
  imageSrc: string, crop: Area, outW: number, outH: number,
): Promise<string> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  canvas.width = outW * PHOTO_SCALE;
  canvas.height = outH * PHOTO_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function PhotoUpload({ value, onChange, width = 85, height = 113 }: PhotoUploadProps) {
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const aspect = width / height;

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setTempImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!tempImage || !croppedArea) return;
    const cropped = await getCroppedImg(tempImage, croppedArea, width, height);
    onChange(cropped);
    setTempImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [tempImage, croppedArea, width, height, onChange]);

  const handleCancel = useCallback(() => {
    setTempImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // クロップUI
  if (tempImage) {
    return (
      <div className="bg-brown-100 dark:bg-brown-800 rounded-xl p-4">
        <div className="relative w-full" style={{ height: 260 }}>
          <Cropper
            image={tempImage}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range" min={1} max={3} step={0.1} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-full mt-3 accent-accent"
        />
        <div className="flex gap-2 mt-2 justify-end">
          <button
            type="button" onClick={handleCancel}
            className="px-4 py-1.5 text-xs rounded-lg bg-brown-200 dark:bg-brown-700 text-brown-700 dark:text-brown-200 hover:bg-brown-300 dark:hover:bg-brown-600 transition-colors"
          >キャンセル</button>
          <button
            type="button" onClick={handleConfirm}
            className="px-4 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors"
          >確定</button>
        </div>
      </div>
    );
  }

  // アップロードエリア
  return (
    <div>
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={cn(
          'relative w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors flex items-center justify-center overflow-hidden',
          isDragging ? 'border-accent bg-accent/5'
            : value ? 'border-brown-200 dark:border-brown-700'
            : 'border-brown-300 dark:border-brown-600 hover:border-accent',
        )}
        style={{ minHeight: height + 16 }}
      >
        {value ? (
          <>
            <img src={value} alt="証明写真" className="object-cover" style={{ width, height }} />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
            >✕</button>
          </>
        ) : (
          <div className="text-center text-brown-400 dark:text-brown-500 py-3">
            <svg className="w-6 h-6 mx-auto mb-1 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 3h10.5A2.25 2.25 0 0119.5 5.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3z" />
            </svg>
            <p className="text-sm">クリックまたはドラッグ＆ドロップで画像を選択</p>
            <p className="text-xs text-brown-300 dark:text-brown-600 mt-0.5">推奨: 4x3比率（JPG/PNG）</p>
          </div>
        )}
      </div>
    </div>
  );
}
