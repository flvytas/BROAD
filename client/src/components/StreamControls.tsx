import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Stream } from "@shared/schema";
import WebcamStreamer from "./WebcamStreamer";

interface Props {
  stream: Stream;
}

export default function StreamControls({ stream }: Props) {
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      await apiRequest('POST', `/api/streams/${stream.id}/active`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/streams/${stream.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: "Stream deleted",
        description: "The input source has been removed."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete stream",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stream Controls</h2>

      <div className="flex gap-2">
        <Button
          variant={stream.isActive ? "secondary" : "default"}
          onClick={() => toggleMutation.mutate(!stream.isActive)}
          disabled={toggleMutation.isPending}
        >
          {stream.isActive ? (
            <><Pause className="h-4 w-4 mr-2" /> Stop</>
          ) : (
            <><Play className="h-4 w-4 mr-2" /> Start</>
          )}
        </Button>

        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        <Button 
          variant="destructive" 
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {stream.inputType === 'webcam' && (
        <WebcamStreamer stream={stream} isActive={stream.isActive} />
      )}

      <div className="text-sm text-muted-foreground">
        Stream Key: {stream.streamKey}
      </div>
    </div>
  );
}