import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import CreateStreamDialog from "./CreateStreamDialog";
import type { Stream } from "@shared/schema";

interface Props {
  streams: Stream[];
  isLoading: boolean;
  selectedStream: Stream | null;
  onSelectStream: (stream: Stream) => void;
}

export default function InputSelector({
  streams,
  isLoading,
  selectedStream,
  onSelectStream
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Input Sources</h2>
        <CreateStreamDialog />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {streams?.map(stream => (
          <div
            key={stream.id}
            className={`p-2 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
              selectedStream?.id === stream.id ? 'border-primary' : 'border-border'
            }`}
            onClick={() => onSelectStream(stream)}
          >
            <div className="flex items-center gap-3">
              <div className="relative aspect-video w-32 bg-muted rounded overflow-hidden">
                {stream.isActive && stream.thumbnailUpdatedAt && (
                  <img
                    src={`/api/streams/${stream.streamKey}/thumbnail`}
                    alt={`${stream.name} preview`}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
              <div>
                <div className="font-medium">{stream.name}</div>
                <div className="text-sm text-muted-foreground">
                  {stream.inputType}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {streams?.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          No input sources configured
        </div>
      )}
    </div>
  );
}