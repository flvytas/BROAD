import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play, Trash2, Clock, HardDrive, FileVideo } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Recording } from "@shared/schema";

interface Props {
  streamId?: number;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordingsGallery({ streamId }: Props) {
  const { toast } = useToast();

  const { data: recordings = [], isLoading } = useQuery<Recording[]>({
    queryKey: ['/api/recordings', streamId],
    queryFn: async () => {
      const url = streamId ? `/api/recordings?streamId=${streamId}` : '/api/recordings';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch recordings');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete recording');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      toast({ title: "Recording deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete recording", description: error.message, variant: "destructive" });
    }
  });

  const handleDownload = (recording: Recording) => {
    const link = document.createElement('a');
    link.href = `/api/recordings/${recording.id}/download`;
    link.download = `${recording.name}.${recording.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Recordings Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Recordings Gallery
          <Badge variant="secondary">{recordings.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recordings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No recordings found</p>
            <p className="text-sm">
              {streamId 
                ? "This stream has no recordings yet. Enable recording and start streaming to create recordings." 
                : "No recordings available. Enable recording on your streams to start capturing content."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording: Recording) => (
              <div
                key={recording.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium truncate">{recording.name}</h3>
                    <Badge
                      variant={
                        recording.status === 'completed' ? 'default' :
                        recording.status === 'processing' ? 'secondary' :
                        'destructive'
                      }
                      className={recording.status === 'processing' ? 'animate-pulse' : ''}
                    >
                      {recording.status}
                    </Badge>
                    <Badge variant="outline">
                      {recording.quality}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(recording.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatFileSize(recording.fileSize)}
                    </div>
                    <div>
                      {formatDistanceToNow(new Date(recording.startedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {recording.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(recording)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(recording.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}