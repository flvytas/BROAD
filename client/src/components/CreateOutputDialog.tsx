import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertStreamOutputSchema } from '@shared/schema';
import type { Stream } from '@shared/schema';

const outputFormSchema = insertStreamOutputSchema.extend({
  // RTMP specific fields
  rtmpUrl: z.string().optional(),
  rtmpKey: z.string().optional(),
  
  // SRT specific fields
  srtHost: z.string().optional(),
  srtPort: z.number().optional(),
  srtPassphrase: z.string().optional(),
  
  // Decklink SDI specific fields
  decklinkDevice: z.number().optional(),
  decklinkFormat: z.string().optional(),
});

type OutputFormData = z.infer<typeof outputFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stream: Stream;
}

export default function CreateOutputDialog({ open, onOpenChange, stream }: Props) {
  const { toast } = useToast();

  const form = useForm<OutputFormData>({
    resolver: zodResolver(outputFormSchema),
    defaultValues: {
      name: "",
      outputType: "rtmp",
      outputConfig: "{}",
      enabled: true,
      streamId: stream.id,
    }
  });

  const outputType = form.watch("outputType");

  const createMutation = useMutation({
    mutationFn: async (data: OutputFormData) => {
      // Build the output config based on type
      let outputConfig = {};
      
      switch (data.outputType) {
        case 'rtmp':
          outputConfig = {
            url: data.rtmpUrl,
            streamKey: data.rtmpKey,
          };
          break;
        case 'srt':
          outputConfig = {
            host: data.srtHost,
            port: data.srtPort,
            passphrase: data.srtPassphrase,
          };
          break;
        case 'decklink_sdi':
          outputConfig = {
            deviceIndex: data.decklinkDevice,
            format: data.decklinkFormat,
          };
          break;
      }

      const payload = {
        name: data.name,
        outputType: data.outputType,
        outputConfig: JSON.stringify(outputConfig),
        enabled: data.enabled,
      };

      const response = await apiRequest('POST', `/api/streams/${stream.id}/outputs`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.id, 'outputs'] });
      onOpenChange(false);
      toast({
        title: "Output created",
        description: "New stream output has been configured successfully."
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create output",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: OutputFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stream Output</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Name</FormLabel>
                  <FormControl>
                    <Input placeholder="YouTube Live" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset type-specific fields when output type changes
                      form.setValue('rtmpUrl', '');
                      form.setValue('rtmpKey', '');
                      form.setValue('srtHost', '');
                      form.setValue('srtPort', undefined);
                      form.setValue('srtPassphrase', '');
                      form.setValue('decklinkDevice', undefined);
                      form.setValue('decklinkFormat', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rtmp">RTMP Stream</SelectItem>
                      <SelectItem value="srt">SRT Stream</SelectItem>
                      <SelectItem value="decklink_sdi">Decklink SDI Output</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {outputType === 'rtmp' && (
              <>
                <FormField
                  control={form.control}
                  name="rtmpUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RTMP URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="rtmp://a.rtmp.youtube.com/live2" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rtmpKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream Key</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Your stream key" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {outputType === 'srt' && (
              <>
                <FormField
                  control={form.control}
                  name="srtHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SRT Host</FormLabel>
                      <FormControl>
                        <Input placeholder="srt.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="srtPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SRT Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="9998"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="srtPassphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passphrase (Optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Optional passphrase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {outputType === 'decklink_sdi' && (
              <>
                <FormField
                  control={form.control}
                  name="decklinkDevice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decklink Device Index</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="decklinkFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Format</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1080p25">1080p25</SelectItem>
                          <SelectItem value="1080p30">1080p30</SelectItem>
                          <SelectItem value="1080p50">1080p50</SelectItem>
                          <SelectItem value="1080p60">1080p60</SelectItem>
                          <SelectItem value="1080i50">1080i50</SelectItem>
                          <SelectItem value="1080i60">1080i60</SelectItem>
                          <SelectItem value="720p50">720p50</SelectItem>
                          <SelectItem value="720p60">720p60</SelectItem>
                          <SelectItem value="2160p25">4K 2160p25</SelectItem>
                          <SelectItem value="2160p30">4K 2160p30</SelectItem>
                          <SelectItem value="2160p50">4K 2160p50</SelectItem>
                          <SelectItem value="2160p60">4K 2160p60</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Output'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}