import { streams, streamOutputs, recordings, type Stream, type InsertStream, type StreamOutput, type InsertStreamOutput, type Recording, type InsertRecording, type StreamStats } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from 'nanoid';
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async createStream(insertStream: InsertStream): Promise<Stream> {
    const [stream] = await db
      .insert(streams)
      .values({
        ...insertStream,
        streamKey: nanoid(),
        recordingEnabled: insertStream.recordingEnabled ?? false,
        recordingQuality: insertStream.recordingQuality ?? '720p',
        recordingFormat: insertStream.recordingFormat ?? 'mp4'
      })
      .returning();
    return stream;
  }

  async getStream(id: number): Promise<Stream | undefined> {
    const [stream] = await db.select().from(streams).where(eq(streams.id, id));
    return stream || undefined;
  }

  async getAllStreams(): Promise<Stream[]> {
    return await db.select().from(streams);
  }

  async updateStreamHealth(id: number, health: number): Promise<Stream> {
    const [stream] = await db
      .update(streams)
      .set({ health, lastSeen: new Date() })
      .where(eq(streams.id, id))
      .returning();
    return stream;
  }

  async setStreamActive(id: number, active: boolean): Promise<Stream> {
    const [stream] = await db
      .update(streams)
      .set({ isActive: active })
      .where(eq(streams.id, id))
      .returning();
    return stream;
  }

  async updateThumbnailTimestamp(id: number): Promise<Stream> {
    const [stream] = await db
      .update(streams)
      .set({ thumbnailUpdatedAt: new Date() })
      .where(eq(streams.id, id))
      .returning();
    return stream;
  }

  async deleteStream(id: number): Promise<void> {
    await db.delete(streams).where(eq(streams.id, id));
  }

  async updateStreamRecordingSettings(id: number, settings: { recordingEnabled: boolean; recordingQuality?: string; recordingFormat?: string }): Promise<Stream> {
    const [stream] = await db
      .update(streams)
      .set({
        recordingEnabled: settings.recordingEnabled,
        recordingQuality: settings.recordingQuality,
        recordingFormat: settings.recordingFormat
      })
      .where(eq(streams.id, id))
      .returning();
    return stream;
  }

  // Stream outputs
  async createStreamOutput(insertOutput: InsertStreamOutput): Promise<StreamOutput> {
    const [output] = await db
      .insert(streamOutputs)
      .values(insertOutput)
      .returning();
    return output;
  }

  async getStreamOutputs(streamId: number): Promise<StreamOutput[]> {
    return await db
      .select()
      .from(streamOutputs)
      .where(eq(streamOutputs.streamId, streamId));
  }

  async updateStreamOutput(id: number, data: Partial<StreamOutput>): Promise<StreamOutput> {
    const [output] = await db
      .update(streamOutputs)
      .set(data)
      .where(eq(streamOutputs.id, id))
      .returning();
    return output;
  }

  async deleteStreamOutput(id: number): Promise<void> {
    await db.delete(streamOutputs).where(eq(streamOutputs.id, id));
  }

  async setOutputEnabled(id: number, enabled: boolean): Promise<StreamOutput> {
    const [output] = await db
      .update(streamOutputs)
      .set({ 
        enabled,
        status: enabled ? "active" : "inactive"
      })
      .where(eq(streamOutputs.id, id))
      .returning();
    return output;
  }

  // Stream statistics (keeping in-memory for now as they're transient)
  private streamStats: Map<number, StreamStats> = new Map();

  async updateStreamStats(streamId: number, stats: Partial<StreamStats>): Promise<void> {
    const existing = this.streamStats.get(streamId);
    const updated: StreamStats = {
      streamId,
      videoBitrate: stats.videoBitrate ?? existing?.videoBitrate,
      audioBitrate: stats.audioBitrate ?? existing?.audioBitrate,
      videoResolution: stats.videoResolution ?? existing?.videoResolution,
      videoFrameRate: stats.videoFrameRate ?? existing?.videoFrameRate,
      audioSampleRate: stats.audioSampleRate ?? existing?.audioSampleRate,
      audioChannels: stats.audioChannels ?? existing?.audioChannels,
      codec: stats.codec ?? existing?.codec,
      audioCodec: stats.audioCodec ?? existing?.audioCodec,
      timestamp: new Date()
    };
    this.streamStats.set(streamId, updated);
  }

  async getStreamStats(streamId: number): Promise<StreamStats | null> {
    return this.streamStats.get(streamId) || null;
  }

  // Recording methods
  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const [recording] = await db
      .insert(recordings)
      .values(insertRecording)
      .returning();
    return recording;
  }

  async getRecordings(streamId?: number): Promise<Recording[]> {
    if (streamId) {
      return await db
        .select()
        .from(recordings)
        .where(eq(recordings.streamId, streamId));
    }
    return await db.select().from(recordings);
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording || undefined;
  }

  async updateRecordingStatus(id: number, status: string, fileSize?: number, duration?: number): Promise<Recording> {
    const [recording] = await db
      .update(recordings)
      .set({
        status,
        fileSize,
        duration,
        completedAt: status === 'completed' ? new Date() : undefined
      })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  async deleteRecording(id: number): Promise<void> {
    await db.delete(recordings).where(eq(recordings.id, id));
  }
}