import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Maximize2, Tag, Eye } from 'lucide-react';
import { BoundingBox } from '../../types';

interface ImageAnnotationViewerProps {
  imageUrl?: string;
  boxes?: BoundingBox[];
  targetLabel?: string;
  onUpdateBox?: (index: number, updated: BoundingBox) => void;
  readOnly?: boolean;
}

export const ImageAnnotationViewer: React.FC<ImageAnnotationViewerProps> = ({
  imageUrl,
  boxes = [],
  targetLabel,
  onUpdateBox,
  readOnly = false,
}) => {
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);

  if (!imageUrl || imageUrl.trim() === '') {
    return (
      <div className="p-6 bg-slate-100 border border-slate-300 rounded-xl text-center flex flex-col items-center justify-center min-h-[220px]">
        <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
        <p className="text-xs font-bold text-slate-800">Missing Media File</p>
        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
          No image URL provided for this row record. Bounding box coordinates cannot be visually mapped.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Visual Canvas Container with Image and SVG overlay */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center min-h-[260px] max-h-[340px] select-none">
        {imageError ? (
          <div className="text-center p-6 text-slate-400">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-semibold">Image Failed to Load</p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono break-all max-w-sm">{imageUrl}</p>
          </div>
        ) : (
          <>
            <img
              src={imageUrl}
              alt="Annotation under audit"
              onError={() => setImageError(true)}
              className="max-h-[340px] w-auto object-contain block mx-auto"
            />

            {/* SVG overlay for bounding boxes */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {boxes.map((box, idx) => {
                const isSelected = selectedBoxIndex === idx;
                const isInvalid =
                  box.x < 0 ||
                  box.y < 0 ||
                  box.x > 1 ||
                  box.y > 1 ||
                  box.width <= 0 ||
                  box.height <= 0 ||
                  box.x + box.width > 1.05 ||
                  box.y + box.height > 1.05;

                const strokeColor = isInvalid
                  ? '#ef4444' // red
                  : isSelected
                  ? '#3b82f6' // bright blue
                  : '#10b981'; // green

                // Convert normalized 0-1 to percentage (0-100)
                const normX = Math.max(0, Math.min(100, box.x * 100));
                const normY = Math.max(0, Math.min(100, box.y * 100));
                const normW = Math.max(2, Math.min(100, box.width * 100));
                const normH = Math.max(2, Math.min(100, box.height * 100));

                return (
                  <g key={idx}>
                    <rect
                      x={`${normX}%`}
                      y={`${normY}%`}
                      width={`${normW}%`}
                      height={`${normH}%`}
                      fill={isInvalid ? 'rgba(239, 68, 68, 0.18)' : 'rgba(59, 130, 246, 0.15)'}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      strokeDasharray={isInvalid ? '4 2' : 'none'}
                    />
                    {/* Label Tag on Box */}
                    <text
                      x={`${normX}%`}
                      y={`${Math.max(4, normY - 1.5)}%`}
                      fill={strokeColor}
                      fontSize="3.8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {box.label || targetLabel || `Box #${idx + 1}`}
                      {isInvalid ? ' [INVALID COORDS]' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5">
          <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded border border-slate-700 font-mono">
            {boxes.length} Bounding {boxes.length === 1 ? 'Box' : 'Boxes'}
          </span>
          {targetLabel && (
            <span className="bg-blue-600/90 text-white text-[10px] px-2 py-0.5 rounded font-semibold">
              Label: {targetLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bounding Box Coordinate Inspector & Fix Controls */}
      {boxes.length > 0 && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Box Geometry Audit:</span>
            <div className="flex space-x-1">
              {boxes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedBoxIndex(i)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    selectedBoxIndex === i
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  Box #{i + 1}
                </button>
              ))}
            </div>
          </div>

          {boxes[selectedBoxIndex] && (
            <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">X (norm):</span>
                <span
                  className={`font-bold ${
                    boxes[selectedBoxIndex].x < 0 || boxes[selectedBoxIndex].x > 1
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {boxes[selectedBoxIndex].x.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Y (norm):</span>
                <span
                  className={`font-bold ${
                    boxes[selectedBoxIndex].y < 0 || boxes[selectedBoxIndex].y > 1
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {boxes[selectedBoxIndex].y.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Width:</span>
                <span
                  className={`font-bold ${
                    boxes[selectedBoxIndex].width <= 0 || boxes[selectedBoxIndex].x + boxes[selectedBoxIndex].width > 1.05
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {boxes[selectedBoxIndex].width.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Height:</span>
                <span
                  className={`font-bold ${
                    boxes[selectedBoxIndex].height <= 0 || boxes[selectedBoxIndex].y + boxes[selectedBoxIndex].height > 1.05
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {boxes[selectedBoxIndex].height.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Quick Normalizer / Auto-clamp action */}
          {!readOnly && onUpdateBox && boxes[selectedBoxIndex] && (
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Need to fix out-of-bounds box?</span>
              <button
                type="button"
                onClick={() => {
                  const b = boxes[selectedBoxIndex];
                  const clampedX = Math.max(0, Math.min(0.85, Math.abs(b.x > 1 ? 0.15 : b.x)));
                  const clampedY = Math.max(0, Math.min(0.85, Math.abs(b.y > 1 ? 0.15 : b.y)));
                  const clampedW = Math.max(0.1, Math.min(1 - clampedX, Math.abs(b.width)));
                  const clampedH = Math.max(0.1, Math.min(1 - clampedY, Math.abs(b.height)));
                  onUpdateBox(selectedBoxIndex, {
                    ...b,
                    x: clampedX,
                    y: clampedY,
                    width: clampedW,
                    height: clampedH,
                    isValid: true,
                  });
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Auto-Clamp Coordinates to [0, 1]
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
