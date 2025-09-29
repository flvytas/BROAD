import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Video, HardDrive, Cpu, Wifi, TrendingUp } from "lucide-react";
import StreamCard from "./StreamCard";
import StreamPlayer from "./StreamPlayer";
import StreamHealth from "./StreamHealth";
import StreamOutputs from "./StreamOutputs";
import RecordingSettings from "./RecordingSettings";
import RecordingsGallery from "./RecordingsGallery";
import type { Stream } from "@shared/schema";

export default function StreamDashboard() {
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  const { data: streams = [], isLoading } = useQuery<Stream[]>({
    queryKey: ['/api/streams']
  });

  const activeStreams = streams.filter(s => s.isActive).length;
  const totalStreams = streams.length;

  const systemStats = [
    { label: "Active Streams", value: activeStreams, icon: Activity, color: "text-green-500" },
    { label: "Total Streams", value: totalStreams, icon: Video, color: "text-blue-500" },
    { label: "System Load", value: "42%", icon: Cpu, color: "text-yellow-500" },
    { label: "Storage", value: "1.2TB", icon: HardDrive, color: "text-purple-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Dashboard Grid */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Stream List Sidebar */}
          <div className="xl:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Stream Sources
                  <Badge variant="secondary" className="ml-auto">
                    {totalStreams}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : streams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No streams configured</p>
                    <p className="text-sm">Create your first stream to get started</p>
                  </div>
                ) : (
                  streams.map(stream => (
                    <StreamCard
                      key={stream.id}
                      stream={stream}
                      isSelected={selectedStream?.id === stream.id}
                      onSelect={setSelectedStream}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Preview and Controls */}
          <div className="xl:col-span-3">
            {selectedStream ? (
              <Tabs defaultValue="preview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 bg-muted/50">
                  <TabsTrigger value="preview" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Live Preview
                  </TabsTrigger>
                  <TabsTrigger value="health" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="outputs" className="gap-2">
                    <Wifi className="h-4 w-4" />
                    Outputs
                  </TabsTrigger>
                  <TabsTrigger value="recording" className="gap-2">
                    <HardDrive className="h-4 w-4" />
                    Recording
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="gap-2">
                    <Video className="h-4 w-4" />
                    Gallery
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <StreamPlayer stream={selectedStream} />
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Stream Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge variant={selectedStream.isActive ? "default" : "secondary"}>
                              {selectedStream.isActive ? "Live" : "Offline"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Input Type</p>
                            <p className="font-medium capitalize">{selectedStream.inputType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Health</p>
                            <p className="font-medium">{selectedStream.health}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Recording</p>
                            <Badge variant={selectedStream.recordingEnabled ? "destructive" : "secondary"}>
                              {selectedStream.recordingEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Connection Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">RTMP URL</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                              rtmp://localhost:1935/live/{selectedStream.streamKey}
                            </code>
                          </div>
                          <div>
                            <p className="text-muted-foreground">HLS Playback</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                              http://localhost:8000/live/{selectedStream.streamKey}/index.m3u8
                            </code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="health">
                  <StreamHealth stream={selectedStream} />
                </TabsContent>

                <TabsContent value="outputs">
                  <StreamOutputs stream={selectedStream} />
                </TabsContent>

                <TabsContent value="recording">
                  <RecordingSettings stream={selectedStream} />
                </TabsContent>

                <TabsContent value="gallery">
                  <RecordingsGallery streamId={selectedStream.id} />
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Stream Selected</h3>
                  <p className="text-sm">Select a stream from the sidebar to view details and controls</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Full-width Recordings Gallery */}
        {!selectedStream && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Recent Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecordingsGallery />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}