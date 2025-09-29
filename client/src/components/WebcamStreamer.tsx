import { useEffect, useRef, useState } from 'react';
import type { Stream } from '@shared/schema';
import { Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  stream: Stream;
  isActive: boolean;
}

export default function WebcamStreamer({ stream, isActive }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestPermission = async () => {
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const config = JSON.parse(stream.inputConfig);
      const constraints = {
        video: {
          deviceId: config.deviceId !== 'default' ? { exact: config.deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      };

      console.log('Requesting webcam access with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Webcam access granted');

      mediaStreamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('Video element started playing');
      }

      // Setup WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Start sending video data
        const mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType: 'video/webm;codecs=h264',
          videoBitsPerSecond: 2500000 // 2.5 Mbps
        });

        mediaRecorder.ondataavailable = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(1000); // Send data every second
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to streaming server');
      };

      setIsLoading(false);
    } catch (error) {
      console.error('Error accessing webcam:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionDenied(true);
        } else if (error.name === 'NotFoundError') {
          setError('Camera device not found. Please check if your camera is connected and not being used by another application.');
        } else if (error.name === 'NotReadableError') {
          setError('Camera is already in use by another application. Please close other applications using the camera and try again.');
        } else if (error.name === 'OverconstrainedError') {
          setError('Selected camera does not support the required settings. Please try a different camera.');
        } else {
          setError(error.message || 'Failed to access webcam');
        }
      } else {
        setError('Failed to access webcam');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      // Clean up when stream is deactivated
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    requestPermission();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isActive, stream.inputConfig]);

  if (permissionDenied) {
    return (
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/90 mb-4">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
          <Camera className="h-12 w-12 text-white/80" />
          <p className="text-white text-center font-medium">Camera Access Required</p>
          <div className="text-white/80 text-sm text-center mb-4 space-y-2">
            <p>To use webcam streaming, please:</p>
            <ol className="text-left space-y-1">
              <li>1. Look for a camera icon in your browser's address bar</li>
              <li>2. Click it and select "Allow" for camera access</li>
              <li>3. Click the button below to try again</li>
            </ol>
          </div>
          <Button onClick={requestPermission} variant="secondary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black mb-4">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white bg-red-500/80 px-4 py-2 rounded">{error}</p>
        </div>
      )}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover"
      />
    </div>
  );
}