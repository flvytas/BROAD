import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Settings, Trash2, Signal } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Stream } from "@shared/schema";

interface Props {
  stream: Stream;
  isSelected: boolean;
  onSelect: (stream: Stream) => void;
  onEdit?: (stream: Stream) => void;
}

export default function StreamCard({ stream, isSelected, onSelect, onEdit }: Props) {
  const { toast } = useToast();

  const toggleStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/streams/${stream.id}/${stream.isActive ? 'stop' : 'start'}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to toggle stream');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({ 
        title: stream.isActive ? "Stream stopped" : "Stream started",
        description: `${stream.name} is now ${stream.isActive ? 'offline' : 'live'}`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to toggle stream", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const deleteStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/streams/${stream.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete stream');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({ title: "Stream deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete stream", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const getHealthColor = (health: number | null) => {
    if (!health || health < 50) return "text-red-500";
    if (health < 80) return "text-yellow-500";
    return "text-green-500";
  };

  const getInputTypeIcon = (inputType: string) => {
    switch (inputType) {
      case 'webcam': return '📹';
      case 'rtmp': return '📡';
      case 'decklink': return '🎥';
      default: return '📺';
    }
  };

  return (
    <Card 
      className={`group transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isSelected 
          ? 'ring-2 ring-primary shadow-lg bg-primary/5' 
          : 'hover:bg-accent/50'
      }`}
      onClick={() => onSelect(stream)}
    >
      <CardContent className="p-4">
        {/* Stream Preview */}
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/70 mb-4">
          {stream.isActive && stream.thumbnailUpdatedAt ? (
            <img
              src={`/api/streams/${stream.streamKey}/thumbnail`}
              alt={`${stream.name} preview`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">{getInputTypeIcon(stream.inputType)}</div>
                <p className="text-sm">
                  {stream.isActive ? 'Loading preview...' : 'Stream offline'}
                </p>
              </div>
            </div>
          )}
          
          {/* Status Overlay */}
          <div className="absolute top-2 left-2">
            <Badge 
              variant={stream.isActive ? "default" : "secondary"}
              className={`gap-1 ${stream.isActive ? 'bg-red-600 animate-pulse' : ''}`}
            >
              {stream.isActive ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  LIVE
                </>
              ) : (
                'OFFLINE'
              )}
            </Badge>
          </div>

          {/* Health Indicator */}
          {stream.isActive && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
                <Signal className={`h-3 w-3 ${getHealthColor(stream.health)}`} />
                {stream.health}%
              </Badge>
            </div>
          )}

          {/* Recording Indicator */}
          {stream.recordingEnabled && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="destructive" className="gap-1 text-xs">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                REC
              </Badge>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg truncate">{stream.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{stream.inputType}</span>
              {stream.lastSeen && (
                <>
                  <span>•</span>
                  <span>Recently active</span>
                </>
              )}
            </div>
          </div>

          {/* Stream Key */}
          <div className="text-xs">
            <span className="text-muted-foreground">Stream Key: </span>
            <code className="bg-muted px-1 py-0.5 rounded text-foreground">
              {stream.streamKey.slice(0, 8)}...
            </code>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant={stream.isActive ? "destructive" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                toggleStreamMutation.mutate();
              }}
              disabled={toggleStreamMutation.isPending}
              className="flex-1"
            >
              {stream.isActive ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(stream);
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                deleteStreamMutation.mutate();
              }}
              disabled={deleteStreamMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}