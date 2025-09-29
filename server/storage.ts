import { streams, streamOutputs, recordings, type Stream, type InsertStream, type StreamOutput, type InsertStreamOutput, type Recording, type InsertRecording, type StreamStats } from "@shared/schema";
import { nanoid } from 'nanoid';

export interface IStorage {
  createStream(stream: InsertStream): Promise<Stream>;
  getStream(id: number): Promise<Stream | undefined>;
  getAllStreams(): Promise<Stream[]>;
  updateStreamHealth(id: number, health: number): Promise<Stream>;
  setStreamActive(id: number, active: boolean): Promise<Stream>;
  updateThumbnailTimestamp(id: number): Promise<Stream>;
  deleteStream(id: number): Promise<void>;
  updateStreamRecordingSettings(id: number, settings: { recordingEnabled: boolean; recordingQuality?: string; recordingFormat?: string }): Promise<Stream>;
  
  // Stream outputs
  createStreamOutput(output: InsertStreamOutput): Promise<StreamOutput>;
  getStreamOutputs(streamId: number): Promise<StreamOutput[]>;
  updateStreamOutput(id: number, data: Partial<StreamOutput>): Promise<StreamOutput>;
  deleteStreamOutput(id: number): Promise<void>;
  setOutputEnabled(id: number, enabled: boolean): Promise<StreamOutput>;
  
  // Stream statistics
  updateStreamStats(streamId: number, stats: Partial<StreamStats>): Promise<void>;
  getStreamStats(streamId: number): Promise<StreamStats | null>;
  
  // Recordings
  createRecording(recording: InsertRecording): Promise<Recording>;
  getRecordings(streamId?: number): Promise<Recording[]>;
  getRecording(id: number): Promise<Recording | undefined>;
  updateRecordingStatus(id: number, status: string, fileSize?: number, duration?: number): Promise<Recording>;
  deleteRecording(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private streams: Map<number, Stream>;
  private streamOutputs: Map<number, StreamOutput>;
  private streamStats: Map<number, StreamStats>;
  private recordings: Map<number, Recording>;
  private currentId: number;
  private currentOutputId: number;
  private currentRecordingId: number;

  constructor() {
    this.streams = new Map();
    this.streamOutputs = new Map();
    this.streamStats = new Map();
    this.recordings = new Map();
    this.currentId = 1;
    this.currentOutputId = 1;
    this.currentRecordingId = 1;
  }

  async createStream(insertStream: InsertStream): Promise<Stream> {
    const id = this.currentId++;
    const stream: Stream = {
      ...insertStream,
      id,
      isActive: false,
      health: 100,
      lastSeen: new Date(),
      thumbnailUpdatedAt: null,
      streamKey: nanoid(),
      recordingEnabled: insertStream.recordingEnabled ?? false,
      recordingQuality: insertStream.recordingQuality ?? '720p',
      recordingFormat: insertStream.recordingFormat ?? 'mp4'
    };
    this.streams.set(id, stream);
    return stream;
  }

  async getStream(id: number): Promise<Stream | undefined> {
    return this.streams.get(id);
  }

  async getAllStreams(): Promise<Stream[]> {
    return Array.from(this.streams.values());
  }

  async updateStreamHealth(id: number, health: number): Promise<Stream> {
    const stream = this.streams.get(id);
    if (!stream) throw new Error("Stream not found");

    const updated = {
      ...stream,
      health,
      lastSeen: new Date()
    };
    this.streams.set(id, updated);
    return updated;
  }

  async setStreamActive(id: number, active: boolean): Promise<Stream> {
    const stream = this.streams.get(id);
    if (!stream) throw new Error("Stream not found");

    const updated = {
      ...stream,
      isActive: active,
      lastSeen: new Date()
    };
    this.streams.set(id, updated);
    return updated;
  }

  async updateThumbnailTimestamp(id: number): Promise<Stream> {
    const stream = this.streams.get(id);
    if (!stream) throw new Error("Stream not found");

    const updated = {
      ...stream,
      thumbnailUpdatedAt: new Date()
    };
    this.streams.set(id, updated);
    return updated;
  }

  async deleteStream(id: number): Promise<void> {
    if (!this.streams.has(id)) {
      throw new Error("Stream not found");
    }
    
    // Delete all outputs for this stream
    const outputs = Array.from(this.streamOutputs.values()).filter(output => output.streamId === id);
    for (const output of outputs) {
      this.streamOutputs.delete(output.id);
    }
    
    this.streams.delete(id);
  }

  // Stream output methods
  async createStreamOutput(insertOutput: InsertStreamOutput): Promise<StreamOutput> {
    const id = this.currentOutputId++;
    const output: StreamOutput = {
      id,
      streamId: insertOutput.streamId,
      name: insertOutput.name,
      outputType: insertOutput.outputType,
      outputConfig: insertOutput.outputConfig,
      enabled: insertOutput.enabled ?? true,
      status: "inactive",
      createdAt: new Date(),
    };
    this.streamOutputs.set(id, output);
    return output;
  }

  async getStreamOutputs(streamId: number): Promise<StreamOutput[]> {
    return Array.from(this.streamOutputs.values())
      .filter(output => output.streamId === streamId);
  }

  async updateStreamOutput(id: number, data: Partial<StreamOutput>): Promise<StreamOutput> {
    const output = this.streamOutputs.get(id);
    if (!output) throw new Error("Stream output not found");

    const updated = { ...output, ...data };
    this.streamOutputs.set(id, updated);
    return updated;
  }

  async deleteStreamOutput(id: number): Promise<void> {
    if (!this.streamOutputs.has(id)) {
      throw new Error("Stream output not found");
    }
    this.streamOutputs.delete(id);
  }

  async setOutputEnabled(id: number, enabled: boolean): Promise<StreamOutput> {
    const output = this.streamOutputs.get(id);
    if (!output) throw new Error("Stream output not found");

    const updated = {
      ...output,
      enabled,
      status: enabled ? "active" : "inactive"
    };
    this.streamOutputs.set(id, updated);
    return updated;
  }

  // Stream statistics methods
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
  async updateStreamRecordingSettings(id: number, settings: { recordingEnabled: boolean; recordingQuality?: string; recordingFormat?: string }): Promise<Stream> {
    const stream = this.streams.get(id);
    if (!stream) throw new Error("Stream not found");

    const updated = {
      ...stream,
      recordingEnabled: settings.recordingEnabled,
      recordingQuality: settings.recordingQuality ?? stream.recordingQuality,
      recordingFormat: settings.recordingFormat ?? stream.recordingFormat
    };
    this.streams.set(id, updated);
    return updated;
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.currentRecordingId++;
    const recording: Recording = {
      ...insertRecording,
      id,
      fileSize: null,
      duration: null,
      status: 'processing',
      completedAt: null,
      createdAt: new Date()
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async getRecordings(streamId?: number): Promise<Recording[]> {
    const allRecordings = Array.from(this.recordings.values());
    if (streamId) {
      return allRecordings.filter(r => r.streamId === streamId);
    }
    return allRecordings;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async updateRecordingStatus(id: number, status: string, fileSize?: number, duration?: number): Promise<Recording> {
    const recording = this.recordings.get(id);
    if (!recording) throw new Error("Recording not found");

    const updated = {
      ...recording,
      status,
      fileSize: fileSize ?? recording.fileSize,
      duration: duration ?? recording.duration,
      completedAt: status === 'completed' ? new Date() : recording.completedAt
    };
    this.recordings.set(id, updated);
    return updated;
  }

  async deleteRecording(id: number): Promise<void> {
    if (!this.recordings.has(id)) {
      throw new Error("Recording not found");
    }
    this.recordings.delete(id);
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();