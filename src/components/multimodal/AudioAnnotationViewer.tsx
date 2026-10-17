import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';

interface AudioAnnotationViewerProps {
  audioUrl?: string;
  durationSeconds?: number;
  transcript?: string;
  intentLabel?: string;
  onUpdateDuration?: (newDuration: number) => void;
  onUpdateTranscript?: (newTranscript: string) => void;
  readOnly?: boolean;
}

export const AudioAnnotationViewer: React.FC<AudioAnnotationViewerProps> = ({
  audioUrl,
  durationSeconds,
  transcript,
  intentLabel,
  onUpdateDuration,
  onUpdateTranscript,
  readOnly = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const wordCount = transcript ? transcript.trim().split(/\s+/).length : 0;
  const isNegativeDuration = durationSeconds !== undefined && durationSeconds < 0;
  const isDurationMismatch =
    durationSeconds !== undefined &&
    durationSeconds > 0 &&
    durationSeconds < 3 &&
    wordCount > 35; // e.g. 50 words in 1 second is physically impossible

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  return (
    <div className="space-y-3">
      {/* Audio Player Card */}
      <div className="bg-slate-900 rounded-xl p-4 text-white border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-tight">Audio Stream Player</span>
          </div>
          {intentLabel && (
            <span className="text-[10px] bg-blue-600/90 text-white px-2 py-0.5 rounded font-semibold">
              Label: {intentLabel}
            </span>
          )}
        </div>

        {/* Audio Element */}
        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        ) : (
          <div className="p-3 bg-slate-800/80 rounded-lg text-rose-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Missing audio stream URL. Unable to stream playback.</span>
          </div>
        )}

        {/* Player Controls & Waveform Simulation */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={!audioUrl}
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Waveform / Progress Scrub */}
          <div className="flex-1 space-y-1">
            <div className="h-6 flex items-center space-x-1 px-1">
              {[40, 65, 80, 50, 95, 70, 30, 85, 90, 60, 45, 100, 75, 55, 90, 40, 70, 85, 60, 45, 80, 65, 50, 75, 40].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-full transition-colors ${
                      isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                )
              )}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>{currentTime.toFixed(1)}s</span>
              <span>{durationSeconds ? `${durationSeconds}s` : 'Unknown duration'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Speech Anomaly Diagnostics */}
      {(isNegativeDuration || isDurationMismatch) && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-800">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Speech Quality Anomaly Flagged</span>
          </div>
          {isNegativeDuration && (
            <p className="text-[11px] text-rose-700">
              Negative duration of {durationSeconds}s is physically invalid.
            </p>
          )}
          {isDurationMismatch && (
            <p className="text-[11px] text-rose-700">
              Transcript contains {wordCount} words, but recorded duration is only {durationSeconds}s (Speech rate &gt; 1200 wpm violates human speech acoustic limits).
            </p>
          )}
        </div>
      )}

      {/* Transcript Viewer */}
      {transcript && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Speech Transcript ({wordCount} words)</span>
            </span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white p-2.5 rounded border border-slate-200">
            "{transcript}"
          </p>
        </div>
      )}
    </div>
  );
};
