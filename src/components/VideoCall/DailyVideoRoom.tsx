import { useDaily, useParticipantIds, useVideoTrack, useAudioTrack } from '@daily-co/daily-react'
import { useEffect } from 'react'
import { useState } from 'react'

interface VideoCallProps {
  roomUrl: string
  onLeave: () => void
}

export function DailyVideoRoom({ roomUrl, onLeave }: VideoCallProps) {
  const daily = useDaily()
  const participantIds = useParticipantIds()

  useEffect(() => {
  if (daily && roomUrl) {
    daily.join({ 
      url: roomUrl,
      startAudioOff: false,
      startVideoOff: false
    })
    .then(() => {
      console.log('✅ Joined with audio and video ON')
      
      // Forza attivazione audio dopo join (fix per alcuni browser)
      setTimeout(() => {
        daily.setLocalAudio(true)
        console.log('🎤 Audio forcefully enabled')
      }, 1000)
    })
    .catch((error) => {
      console.error('Failed to join call:', error)
    })
  }
  
  return () => {
    if (daily) {
      daily.leave().catch(console.error)
    }
  }
}, [daily, roomUrl])

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-gray-800 flex items-center justify-between px-6">
        <h2 className="text-white text-lg font-semibold">Video Meeting</h2>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Leave Call
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        {participantIds.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Connecting to meeting...</p>
            </div>
          </div>
        ) : (
          <div className={`w-full h-full grid gap-4 ${
              participantIds.length === 1 ? 'grid-cols-1' :
              participantIds.length === 2 ? 'grid-cols-2' :
              participantIds.length <= 4 ? 'grid-cols-2 grid-rows-2' :
              'grid-cols-3'
              } auto-rows-fr`}>
            {participantIds.map((participantId) => (
              <ParticipantTile
                key={participantId}
                participantId={participantId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-gray-800 flex items-center justify-center gap-4">
        <VideoControls />
      </div>
    </div>
  )
}

// Componente per ogni partecipante
// Componente per ogni partecipante
function ParticipantTile({ participantId }: { participantId: string }) {
  const videoState = useVideoTrack(participantId)
  const audioState = useAudioTrack(participantId)
  const isLocal = participantId === 'local'

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      {/* VIDEO */}
      {videoState.persistentTrack ? (
        <video
          autoPlay
          muted={isLocal}  // Muta solo per partecipante locale (evita feedback)
          playsInline
          ref={(el) => {
            if (el && videoState.persistentTrack) {
              el.srcObject = new MediaStream([videoState.persistentTrack])
            }
          }}
          className="w-full h-full object-contain bg-gray-900"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl text-white">
                {participantId[0].toUpperCase()}
              </span>
            </div>
            <p className="text-white text-sm">Participant {participantId.slice(0, 6)}</p>
          </div>
        </div>
      )}
      
      {/* AUDIO - SOLO per partecipanti remoti */}
      {!isLocal && audioState.persistentTrack && (
        <audio
          autoPlay
          playsInline
          ref={(el) => {
            if (el && audioState.persistentTrack) {
              el.srcObject = new MediaStream([audioState.persistentTrack])
              el.volume = 1.0  // Volume massimo
            }
          }}
        />
      )}
      
      {/* Name Badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-lg">
        <span className="text-white text-sm font-medium">
          {isLocal ? 'You' : `Participant ${participantId.slice(0, 6)}`}
        </span>
      </div>

      {/* Audio indicator - mostra solo quando mutato */}
      {audioState.isOff && (
        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-2">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Componente per i controlli
function VideoControls() {
  const daily = useDaily()
  const [audioEnabled, setAudioEnabled] = useState(true)  // ✅ STATO LOCALE
  const [videoEnabled, setVideoEnabled] = useState(true)  // ✅ STATO LOCALE

  const toggleAudio = async () => {
    if (!daily) return
    
    const newState = !audioEnabled
    console.log('🎤 Toggling audio to:', newState)
    
    try {
      await daily.setLocalAudio(newState)
      setAudioEnabled(newState)  // ✅ Aggiorna stato locale
      console.log('🎤 Audio toggled successfully to:', newState)
    } catch (error) {
      console.error('❌ Error toggling audio:', error)
    }
  }

  const toggleVideo = async () => {
    if (!daily) return
    
    const newState = !videoEnabled
    console.log('📹 Toggling video to:', newState)
    
    try {
      await daily.setLocalVideo(newState)
      setVideoEnabled(newState)  // ✅ Aggiorna stato locale
      console.log('📹 Video toggled successfully to:', newState)
    } catch (error) {
      console.error('❌ Error toggling video:', error)
    }
  }

  return (
    <div className="flex gap-3">
      {/* Mute/Unmute */}
      <button
        onClick={toggleAudio}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          audioEnabled 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-red-600 hover:bg-red-700'
        }`}
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {audioEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          )}
        </svg>
      </button>

      {/* Camera On/Off */}
      <button
        onClick={toggleVideo}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          videoEnabled 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-red-600 hover:bg-red-700'
        }`}
        title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {videoEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          )}
        </svg>
      </button>
    </div>
  )
}