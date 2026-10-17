import React, { useState, useRef } from 'react';
import { Video, AlertTriangle, CheckCircle2, Play, Pause, Clock } from 'lucide-react';

interface VideoAnnotationViewerProps {
  videoUrl?: string;
  startSec?: number;
  endSec?: number;
  actionLabel?: string;
  onUpdateTimestamps?: (start: number, end: number) => void;
  readOnly?: boolean;
}

export const VideoAnnotationViewer: React.FC<VideoAnnotationViewerProps> = ({
  videoUrl,
  startSec = 0,
  endSec = 0,
  actionLabel,
  onUpdateTimestamps,
  readOnly = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(30);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isTemporalInverted = startSec >= endSec;
  const isNegativeStart = startSec < 0;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const jumpToSegment = () => {
    if (videoRef.current && !isNegativeStart) {
      videoRef.current.currentTime = Math.max(0, startSec);
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  return (
    <div className="space-y-3">
      {/* Video Container */}
      <div className="relative bg-black rounded-xl overflow-hidden border border-slate-700 min-h-[220px] max-h-[300px] flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) setVideoDuration(videoRef.current.duration || 30);
            }}
            onEnded={() => setIsPlaying(false)}
            className="w-full max-h-[300px] object-contain"
          />
        ) : (
          <div className="text-center p-6 text-slate-400">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-semibold">Missing Video Source</p>
          </div>
        )}

        {/* Video Overlay Info */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">
            Segment: [{startSec}s &rarr; {endSec}s]
          </span>
          {actionLabel && (
            <span className="bg-rose-600/90 text-white text-[10px] px-2 py-0.5 rounded font-semibold">
              Action: {actionLabel}
            </span>
          )}
        </div>
      </div>

      {/* Video Timeline & Segment Marker */}
      <div className="bg-slate-900 rounded-xl p-3 text-white space-y-2 border border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={!videoUrl}
              onClick={togglePlay}
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <span className="font-mono text-[11px] text-slate-300">
              {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
            </span>
          </div>

          <button
            type="button"
            onClick={jumpToSegment}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold text-blue-400 border border-slate-600"
          >
            Jump to Segment Start
          </button>
        </div>

        {/* Timeline Bar with Annotated Segment Highlighted */}
        <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          {/* Annotated Segment */}
          {!isTemporalInverted && !isNegativeStart && (
            <div
              className="absolute top-0 bottom-0 bg-rose-500/80 rounded"
              style={{
                left: `${Math.min(100, Math.max(0, (startSec / videoDuration) * 100))}%`,
                width: `${Math.min(100, Math.max(2, ((endSec - startSec) / videoDuration) * 100))}%`,
              }}
              title={`Annotated Segment: ${startSec}s to ${endSec}s`}
            />
          )}

          {/* Current playhead */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-sm"
            style={{
              left: `${Math.min(100, Math.max(0, (currentTime / videoDuration) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Temporal Errors Banner */}
      {(isTemporalInverted || isNegativeStart) && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-800">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Temporal Boundary Anomaly</span>
          </div>
          {isTemporalInverted && (
            <p className="text-[11px] text-rose-700">
              Segment start time ({startSec}s) is greater than or equal to end time ({endSec}s). Temporal inversion defect.
            </p>
          )}
          {isNegativeStart && (
            <p className="text-[11px] text-rose-700">
              Negative start timestamp ({startSec}s) violates video temporal boundaries.
            </p>
          )}

          {!readOnly && onUpdateTimestamps && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const safeStart = Math.max(0, Math.min(startSec, endSec));
                  const safeEnd = Math.max(safeStart + 2, Math.max(startSec, endSec));
                  onUpdateTimestamps(safeStart, safeEnd);
                }}
                className="text-blue-600 font-bold hover:underline text-[11px]"
              >
                Auto-Fix Inverted Timestamps &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
