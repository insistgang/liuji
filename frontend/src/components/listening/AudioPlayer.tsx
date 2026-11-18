import { useRef, useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  onTimeUpdate?: (currentTime: number) => void
}

export default function AudioPlayer({ audioUrl, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onTimeUpdate])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      void audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const time = Number(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5]
    const idx = speeds.indexOf(playbackRate)
    const next = speeds[(idx + 1) % speeds.length]
    setPlaybackRate(next)
    if (audioRef.current) {
      audioRef.current.playbackRate = next
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="app-card rounded-2xl p-5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="mb-4 flex items-center gap-3">
        <span className="w-11 text-right font-mono text-xs text-[var(--text-muted)]">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          aria-label="播放进度"
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[var(--bg-muted)] accent-[var(--accent)]"
        />
        <span className="w-11 font-mono text-xs text-[var(--text-muted)]">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => skip(-10)}
          aria-label="后退 10 秒"
          className="app-muted-pill flex h-10 w-10 items-center justify-center rounded-full"
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? '暂停播放' : '开始播放'}
          className="app-accent-solid flex h-12 w-12 items-center justify-center rounded-full shadow-sm"
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          aria-label="快进 10 秒"
          className="app-muted-pill flex h-10 w-10 items-center justify-center rounded-full"
        >
          <SkipForward size={18} />
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          className="app-muted-pill rounded-xl px-3 py-1.5 text-xs font-semibold"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  )
}
