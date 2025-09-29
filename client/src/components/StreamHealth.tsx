import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Monitor, Volume2, Wifi, Clock, Video, AudioWaveform } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Stream, StreamStats } from "@shared/schema";

interface Props {
  stream: Stream;
}

export default function StreamHealth({ stream }: Props) {
  const { data: streamData } = useQuery({
    queryKey: ['/api/streams', stream.id],
    refetchInterval: 5000
  });

  const { data: statsData } = useQuery<StreamStats>({
    queryKey: ['/api/streams', stream.id, 'stats'],
    queryFn: () => apiRequest('GET', `/api/streams/${stream.id}/stats`).then(res => res.json()),
    refetchInterval: 2000, // Update stats more frequently
    retry: false
  });

  const health = streamData?.health ?? stream.health;
  const lastSeen = streamData?.lastSeen ? new Date(streamData.lastSeen) : new Date(stream.lastSeen || Date.now());

  const formatBitrate = (bitrate?: number) => {
    if (!bitrate) return 'N/A';
    if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(1)} Mbps`;
    }
    return `${bitrate} kbps`;
  };

  const formatAudioChannels = (channels?: number) => {
    if (!channels) return 'N/A';
    switch (channels) {
      case 1: return 'Mono';
      case 2: return 'Stereo';
      case 6: return '5.1 Surround';
      case 8: return '7.1 Surround';
      default: return `${channels} channels`;
    }
  };

  const getHealthStatus = (health: number) => {
    if (health >= 80) return { label: 'Excellent', color: 'bg-green-500' };
    if (health >= 60) return { label: 'Good', color: 'bg-yellow-500' };
    if (health >= 40) return { label: 'Fair', color: 'bg-orange-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const healthStatus = getHealthStatus(health);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Stream Health & Statistics
        </h2>
        <Badge variant={health >= 60 ? "default" : "destructive"}>
          {healthStatus.label}
        </Badge>
      </div>
      
      {/* Overall Health */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${healthStatus.color}`} />
            Stream Quality
          </span>
          <span className="font-medium">{health}%</span>
        </div>
        <Progress value={health} className="h-2" />
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last updated: {lastSeen.toLocaleTimeString()}
        </div>
      </div>

      <Separator />

      {/* Live Statistics */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Live Stream Data
        </h3>
        
        {statsData ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Video Statistics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Video className="h-4 w-4" />
                Video
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Resolution</div>
                  <div className="font-medium">
                    {statsData.videoResolution || 'Unknown'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Frame Rate</div>
                  <div className="font-medium">
                    {statsData.videoFrameRate ? `${statsData.videoFrameRate} fps` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Bitrate</div>
                  <div className="font-medium">
                    {formatBitrate(statsData.videoBitrate)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Codec</div>
                  <div className="font-medium">
                    {statsData.codec || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Audio Statistics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AudioWaveform className="h-4 w-4" />
                Audio
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Channels</div>
                  <div className="font-medium">
                    {formatAudioChannels(statsData.audioChannels)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Sample Rate</div>
                  <div className="font-medium">
                    {statsData.audioSampleRate ? `${(statsData.audioSampleRate / 1000).toFixed(1)} kHz` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Bitrate</div>
                  <div className="font-medium">
                    {formatBitrate(statsData.audioBitrate)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Codec</div>
                  <div className="font-medium">
                    {statsData.audioCodec || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stream data available</p>
            <p className="text-xs mt-1">Statistics will appear when stream is active</p>
          </div>
        )}
      </div>
    </div>
  );
}
