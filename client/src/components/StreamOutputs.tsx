import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Monitor, Wifi, HardDrive } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import CreateOutputDialog from '@/components/CreateOutputDialog';
import type { Stream, StreamOutput } from '@shared/schema';

interface Props {
  stream: Stream;
}

export default function StreamOutputs({ stream }: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const { data: outputs = [], isLoading } = useQuery<StreamOutput[]>({
    queryKey: ['/api/streams', stream.id, 'outputs'],
    queryFn: () => apiRequest('GET', `/api/streams/${stream.id}/outputs`).then(res => res.json())
  });

  const deleteOutputMutation = useMutation({
    mutationFn: async (outputId: number) => {
      await apiRequest('DELETE', `/api/outputs/${outputId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.id, 'outputs'] });
      toast({
        title: "Output deleted",
        description: "Stream output has been removed."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete output",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleOutputMutation = useMutation({
    mutationFn: async ({ outputId, enabled }: { outputId: number; enabled: boolean }) => {
      const response = await apiRequest('POST', `/api/outputs/${outputId}/enabled`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.id, 'outputs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update output",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getOutputIcon = (outputType: string) => {
    switch (outputType) {
      case 'rtmp': return <Wifi className="h-4 w-4" />;
      case 'srt': return <Wifi className="h-4 w-4" />;
      case 'decklink_sdi': return <Monitor className="h-4 w-4" />;
      default: return <HardDrive className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOutputConfig = (outputType: string, config: string) => {
    try {
      const parsed = JSON.parse(config);
      switch (outputType) {
        case 'rtmp':
          return `${parsed.url || 'No URL configured'}`;
        case 'srt':
          return `srt://${parsed.host || 'unknown'}:${parsed.port || 0}`;
        case 'decklink_sdi':
          return `Device ${parsed.deviceIndex || 0} - ${parsed.format || '1080p25'}`;
        default:
          return 'Unknown configuration';
      }
    } catch {
      return 'Invalid configuration';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stream Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading outputs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Stream Outputs
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Output
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {outputs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No outputs configured</p>
              <p className="text-sm">Add an output to stream to external services or hardware</p>
            </div>
          ) : (
            outputs.map((output) => (
              <div
                key={output.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getOutputIcon(output.outputType)}
                    <div>
                      <h4 className="font-medium">{output.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getOutputConfig(output.outputType, output.outputConfig)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${getStatusColor(output.status || "inactive")}`}
                      title={output.status || "inactive"}
                    />
                    <Badge variant={output.enabled ? "default" : "secondary"}>
                      {output.enabled ? (output.status || "inactive") : "disabled"}
                    </Badge>
                  </div>
                  
                  <Switch
                    checked={output.enabled || false}
                    onCheckedChange={(enabled) => 
                      toggleOutputMutation.mutate({ outputId: output.id, enabled })
                    }
                    disabled={toggleOutputMutation.isPending}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteOutputMutation.mutate(output.id)}
                    disabled={deleteOutputMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      <CreateOutputDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        stream={stream}
      />
    </>
  );
}