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
      audio.play()
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
    <div className="bg-white rounded-xl shadow-sm p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-500 w-12 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-500 w-12">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => skip(-10)} className="p-2 text-gray-600 hover:text-gray-900">
          <SkipBack size={20} />
        </button>
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button onClick={() => skip(10)} className="p-2 text-gray-600 hover:text-gray-900">
          <SkipForward size={20} />
        </button>
        <button onClick={cycleSpeed} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200">
          {playbackRate}x
        </button>
      </div>
    </div>
  )
}
