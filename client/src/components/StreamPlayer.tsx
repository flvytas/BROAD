import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import type { Stream } from '@shared/schema';

interface Props {
  stream: Stream | null;
}

export default function StreamPlayer({ stream }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      sources: stream ? [{
        src: `http://localhost:8000/live/${stream.streamKey}/index.m3u8`,
        type: 'application/x-mpegURL'
      }] : []
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [stream]);

  if (!stream) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Select a stream to begin</p>
      </div>
    );
  }

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}
