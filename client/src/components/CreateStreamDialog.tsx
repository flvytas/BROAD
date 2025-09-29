import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertStreamSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WebcamDevice {
  deviceId: string;
  label: string;
}

export default function CreateStreamDialog() {
  const [open, setOpen] = useState(false);
  const [webcamDevices, setWebcamDevices] = useState<WebcamDevice[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertStreamSchema),
    defaultValues: {
      name: "",
      inputType: "decklink",
      inputConfig: JSON.stringify({ device: 0 })
    }
  });

  const inputType = form.watch("inputType");

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === "videoinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 4)}`
        }));
      setWebcamDevices(videoDevices);

      // Set default device if available
      if (videoDevices.length > 0) {
        form.setValue('inputConfig', JSON.stringify({ 
          deviceId: videoDevices[0].deviceId 
        }));
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      toast({
        title: "Failed to get camera list",
        description: "Could not access camera devices",
        variant: "destructive"
      });
    }
  };

  const requestPermission = async () => {
    try {
      // Check security context
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS or localhost');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      console.log('Requesting camera permission...');
      console.log('Current origin:', window.location.origin);
      console.log('Security context:', { 
        isSecureContext: window.isSecureContext,
        protocol: location.protocol,
        hostname: location.hostname 
      });
      
      // Request camera access with minimal constraints
      const tempStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      console.log('Camera permission granted, stream received:', tempStream);
      
      // Immediately stop the temporary stream
      tempStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label);
        track.stop();
      });
      
      setPermissionStatus('granted');
      await enumerateDevices();
      
      toast({
        title: "Camera Access Granted",
        description: "You can now select your camera device.",
        variant: "default"
      });
      
    } catch (error: unknown) {
      console.error('Failed to get camera permission:', error);
      
      const errorDetails = error as { name?: string; message?: string; stack?: string };
      console.error('Error details:', {
        name: errorDetails.name,
        message: errorDetails.message,
        stack: errorDetails.stack
      });
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionStatus('denied');
          
          // Check if this is Replit mobile app
          const isReplitMobile = navigator.userAgent.includes('Replit') && 
                                /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          if (isReplitMobile) {
            toast({
              title: "Camera Not Available",
              description: "Camera streaming requires a desktop browser. Please use a computer or open this app in your mobile browser instead of the Replit app.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Camera Access Denied", 
              description: "Please allow camera access when your browser prompts you, or manually enable it in browser settings.",
              variant: "destructive"
            });
          }
        } else if (error.name === 'NotFoundError') {
          toast({
            title: "No Camera Found",
            description: "No camera devices were found. Please connect a camera and try again.",
            variant: "destructive"
          });
        } else if (error.name === 'NotSupportedError') {
          toast({
            title: "Camera Not Supported",
            description: "Your browser or device doesn't support camera access.",
            variant: "destructive"
          });
        } else if (error.name === 'SecurityError') {
          toast({
            title: "Security Error",
            description: "Camera access blocked. This app must be served over HTTPS to access camera.",
            variant: "destructive"
          });
        } else if (error.message.includes('HTTPS') || error.message.includes('localhost')) {
          toast({
            title: "Security Error",
            description: "Camera access requires HTTPS. Please access this app via HTTPS or localhost.",
            variant: "destructive"
          });
        } else {
          setPermissionStatus('denied');
          toast({
            title: "Camera Access Error",
            description: `Unable to access camera: ${error.message}`,
            variant: "destructive"
          });
        }
      } else {
        setPermissionStatus('denied');
        toast({
          title: "Unknown Error",
          description: "An unknown error occurred while requesting camera access.",
          variant: "destructive"
        });
      }
    }
  };

  useEffect(() => {
    if (inputType === "webcam") {
      // Check permission status without requesting
      navigator.permissions.query({ name: 'camera' as PermissionName })
        .then(result => {
          setPermissionStatus(result.state);
          if (result.state === 'granted') {
            enumerateDevices();
          }
          // Don't auto-request permission - let user click button
        })
        .catch(() => {
          // Fallback for browsers that don't support permissions API
          setPermissionStatus('prompt');
        });
    }
  }, [inputType]);

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await apiRequest('POST', '/api/streams', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      setOpen(false);
      toast({
        title: "Stream created",
        description: "New input source has been added successfully."
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create stream",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Input Source</DialogTitle>
          <DialogDescription>
            Create a new input source for your stream. Different input types may require specific permissions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Camera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inputType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Set default config based on input type
                      const config = value === 'decklink'
                        ? { device: 0 }
                        : value === 'webcam'
                        ? { deviceId: 'default' }
                        : { url: '' };
                      form.setValue('inputConfig', JSON.stringify(config));
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="decklink">Blackmagic Decklink</SelectItem>
                      {(() => {
                        const isReplitMobile = navigator.userAgent.includes('Replit') && 
                                              /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                        return !isReplitMobile && <SelectItem value="webcam">Webcam</SelectItem>;
                      })()}
                      <SelectItem value="rtmp">RTMP Input</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {inputType === "webcam" && (
              <>
                {permissionStatus === 'denied' ? (
                  <div className="rounded-lg border p-4 bg-muted">
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <h4 className="font-semibold">Camera Access Denied</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please click the camera icon in your browser's address bar and allow camera access, then click the button below to try again.
                    </p>
                    <Button onClick={requestPermission} variant="secondary" type="button">
                      Try Again
                    </Button>
                  </div>
                ) : permissionStatus === 'prompt' ? (
                  (() => {
                    const isReplitMobile = navigator.userAgent.includes('Replit') && 
                                          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                    
                    if (isReplitMobile) {
                      return (
                        <div className="rounded-lg border p-4 bg-yellow-50 border-yellow-200">
                          <div className="flex items-center gap-3 mb-2">
                            <Camera className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-semibold text-yellow-900">Camera Not Available on Mobile App</h4>
                          </div>
                          <div className="text-sm text-yellow-700 mb-4 space-y-2">
                            <p>Webcam streaming is not supported in the Replit mobile app.</p>
                            <div className="text-xs bg-yellow-100 p-2 rounded">
                              <strong>To use camera features:</strong> Open this app on a desktop computer or in your mobile browser (not the Replit app).
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <Camera className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">Camera Permission Required</h4>
                        </div>
                        <div className="text-sm text-blue-700 mb-4 space-y-2">
                          <p>Click the button below to request camera access.</p>
                          <div className="text-xs bg-blue-100 p-2 rounded space-y-1">
                            <div><strong>Troubleshooting:</strong></div>
                            <div>• Look for a camera icon in your browser's address bar</div>
                            <div>• Check if browser notifications/popups are blocked</div>
                            <div>• Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge)</div>
                            <div>• Try refreshing the page if no permission dialog appears</div>
                          </div>
                        </div>
                        <Button onClick={requestPermission} variant="default" type="button">
                          Request Camera Access
                        </Button>
                      </div>
                    );
                  })()
                ) : webcamDevices.length > 0 && (
                  <FormField
                    control={form.control}
                    name="inputConfig"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camera Device</FormLabel>
                        <Select
                          value={JSON.parse(field.value).deviceId}
                          onValueChange={(deviceId) => {
                            field.onChange(JSON.stringify({ deviceId }));
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {webcamDevices.map((device) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <Button type="submit" disabled={createMutation.isPending || (inputType === 'webcam' && permissionStatus === 'denied')}>
              {createMutation.isPending ? 'Creating...' : 'Create Stream'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}