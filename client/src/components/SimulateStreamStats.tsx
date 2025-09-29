import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, BarChart3 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Stream } from '@shared/schema';

interface Props {
  stream: Stream;
}

export default function SimulateStreamStats({ stream }: Props) {
  const [isSimulating, setIsSimulating] = useState(false);
  const { toast } = useToast();
  
  const simulationMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      if (action === 'start') {
        setIsSimulating(true);
        // Simulate different stream qualities
        const scenarios = [
          {
            videoBitrate: 4500,
            audioBitrate: 128,
            videoResolution: '1920x1080',
            videoFrameRate: 30,
            audioSampleRate: 48000,
            audioChannels: 2,
            codec: 'H.264',
            audioCodec: 'AAC'
          },
          {
            videoBitrate: 2800,
            audioBitrate: 96,
            videoResolution: '1280x720',
            videoFrameRate: 30,
            audioSampleRate: 44100,
            audioChannels: 2,
            codec: 'H.264',
            audioCodec: 'AAC'
          }
        ];

        const sendStats = async () => {
          if (!isSimulating) return;
          
          const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
          const variation = 0.9 + Math.random() * 0.2; // ±10% variation
          
          const stats = {
            ...scenario,
            videoBitrate: Math.round(scenario.videoBitrate * variation),
            audioBitrate: Math.round(scenario.audioBitrate * variation),
          };

          await apiRequest('POST', `/api/streams/${stream.id}/stats`, stats);
          queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.id, 'stats'] });
          
          setTimeout(sendStats, 2000 + Math.random() * 1000); // 2-3 second intervals
        };

        sendStats();
      } else {
        setIsSimulating(false);
      }
    },
    onSuccess: (_, action) => {
      if (action === 'start') {
        toast({
          title: "Stream simulation started",
          description: "Live statistics are now being generated"
        });
      } else {
        toast({
          title: "Stream simulation stopped",
          description: "Statistics simulation has been disabled"
        });
      }
    }
  });

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          Demo Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Simulate live stream statistics to test the health monitoring interface.
        </p>
        <div className="flex gap-2">
          {!isSimulating ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => simulationMutation.mutate('start')}
              disabled={simulationMutation.isPending}
              className="gap-2"
            >
              <Play className="h-3 w-3" />
              Start Demo
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => simulationMutation.mutate('stop')}
              disabled={simulationMutation.isPending}
              className="gap-2"
            >
              <Square className="h-3 w-3" />
              Stop Demo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}