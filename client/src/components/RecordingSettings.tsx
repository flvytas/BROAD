import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Settings, Play, Square } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Stream, Recording } from "@shared/schema";

interface Props {
  stream: Stream;
}

export default function RecordingSettings({ stream }: Props) {
  const { toast } = useToast();
  const [recordingEnabled, setRecordingEnabled] = useState(stream.recordingEnabled || false);
  const [recordingQuality, setRecordingQuality] = useState(stream.recordingQuality || '720p');
  const [recordingFormat, setRecordingFormat] = useState(stream.recordingFormat || 'mp4');

  const { data: recordings = [], isLoading: recordingsLoading } = useQuery<Recording[]>({
    queryKey: ['/api/recordings', stream.id],
    queryFn: async () => {
      const response = await fetch(`/api/recordings?streamId=${stream.id}`);
      if (!response.ok) throw new Error('Failed to fetch recordings');
      return response.json();
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { recordingEnabled: boolean; recordingQuality: string; recordingFormat: string }) => {
      const response = await fetch(`/api/streams/${stream.id}/recording-settings`, {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({ title: "Recording settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update recording settings", description: error.message, variant: "destructive" });
    }
  });

  const startRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/streams/${stream.id}/recordings/start`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start recording');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings', stream.id] });
      toast({ title: "Recording started successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start recording", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      recordingEnabled,
      recordingQuality,
      recordingFormat
    });
  };

  const activeRecording = recordings.find((r: Recording) => r.status === 'processing');
  const canStartRecording = (stream.recordingEnabled || false) && stream.isActive && !activeRecording;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Recording Settings
          {!(stream.recordingEnabled || false) && (
            <Badge variant="secondary">Disabled</Badge>
          )}
          {activeRecording && (
            <Badge variant="destructive" className="animate-pulse">
              Recording Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Warning */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Performance Notice</p>
            <p className="text-amber-700">
              Recording uses additional system resources. Enable only when needed to maintain optimal streaming performance.
            </p>
          </div>
        </div>

        {/* Recording Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Recording</p>
            <p className="text-sm text-muted-foreground">
              Record this stream to local storage
            </p>
          </div>
          <Switch
            checked={recordingEnabled}
            onCheckedChange={setRecordingEnabled}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        {recordingEnabled && (
          <>
            {/* Quality Settings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recording Quality</label>
              <Select value={recordingQuality} onValueChange={setRecordingQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (Lower CPU usage)</SelectItem>
                  <SelectItem value="720p">720p (Balanced)</SelectItem>
                  <SelectItem value="1080p">1080p (High quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format Settings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recording Format</label>
              <Select value={recordingFormat} onValueChange={setRecordingFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                  <SelectItem value="mkv">MKV (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            variant="outline"
          >
            Save Settings
          </Button>
          
          {recordingEnabled && (
            <Button
              onClick={() => startRecordingMutation.mutate()}
              disabled={!canStartRecording || startRecordingMutation.isPending}
              variant={activeRecording ? "destructive" : "default"}
            >
              {activeRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {!stream.isActive && recordingEnabled && (
          <p className="text-sm text-muted-foreground">
            Stream must be active to start recording
          </p>
        )}
      </CardContent>
    </Card>
  );
}