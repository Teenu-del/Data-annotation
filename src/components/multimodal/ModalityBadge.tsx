import React from 'react';
import { FileText, Image, Mic, Video, Layers } from 'lucide-react';
import { Modality } from '../../types';

interface ModalityBadgeProps {
  modality?: Modality;
  showLabel?: boolean;
  className?: string;
}

export const ModalityBadge: React.FC<ModalityBadgeProps> = ({
  modality = 'text',
  showLabel = true,
  className = '',
}) => {
  switch (modality) {
    case 'image':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
        >
          <Image className="w-3 h-3 text-indigo-600" />
          {showLabel && <span>Image Vision</span>}
        </span>
      );
    case 'audio':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <Mic className="w-3 h-3 text-emerald-600" />
          {showLabel && <span>Audio Speech</span>}
        </span>
      );
    case 'video':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          <Video className="w-3 h-3 text-rose-600" />
          {showLabel && <span>Video Temporal</span>}
        </span>
      );
    case 'multimodal':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
        >
          <Layers className="w-3 h-3 text-purple-600" />
          {showLabel && <span>Multimodal</span>}
        </span>
      );
    case 'text':
    default:
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <FileText className="w-3 h-3 text-slate-500" />
          {showLabel && <span>Tabular Text</span>}
        </span>
      );
  }
};
