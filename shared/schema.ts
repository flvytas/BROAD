import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inputType: text("input_type").notNull(), // 'decklink', 'webcam', 'rtmp'
  inputConfig: text("input_config").notNull(), // JSON string of config
  isActive: boolean("is_active").default(false),
  streamKey: text("stream_key").notNull(),
  health: integer("health").default(100),
  lastSeen: timestamp("last_seen"),
  thumbnailUpdatedAt: timestamp("thumbnail_updated_at"),
  recordingEnabled: boolean("recording_enabled").default(false),
  recordingQuality: text("recording_quality").default('720p'), // '1080p', '720p', '480p'
  recordingFormat: text("recording_format").default('mp4'), // 'mp4', 'mkv'
});

export const streamOutputs = pgTable("stream_outputs", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => streams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  outputType: text("output_type").notNull(), // 'rtmp', 'srt', 'decklink_sdi'
  outputConfig: text("output_config").notNull(), // JSON config for the output
  enabled: boolean("enabled").default(true),
  status: text("status").default("inactive"), // 'active', 'inactive', 'error'
  createdAt: timestamp("created_at").defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull().references(() => streams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size"), // bytes
  duration: integer("duration"), // seconds
  quality: text("quality").notNull(), // '1080p', '720p', '480p'
  format: text("format").notNull(), // 'mp4', 'mkv'
  status: text("status").default("processing"), // 'processing', 'completed', 'failed'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStreamSchema = createInsertSchema(streams).omit({
  id: true,
  isActive: true,
  health: true,
  lastSeen: true,
  thumbnailUpdatedAt: true,
  streamKey: true  // Now omitting streamKey as it should be generated server-side
}).extend({
  recordingEnabled: z.boolean().optional(),
  recordingQuality: z.enum(['1080p', '720p', '480p']).optional(),
  recordingFormat: z.enum(['mp4', 'mkv']).optional(),
});

export const insertStreamOutputSchema = createInsertSchema(streamOutputs).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  fileSize: true,
  duration: true,
  status: true,
  completedAt: true,
  createdAt: true,
});

export type Stream = typeof streams.$inferSelect;
export type InsertStream = z.infer<typeof insertStreamSchema>;
export type StreamOutput = typeof streamOutputs.$inferSelect;
export type InsertStreamOutput = z.infer<typeof insertStreamOutputSchema>;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;

export const streamHealthSchema = z.object({
  id: z.number(),
  health: z.number(),
  lastSeen: z.date()
});

export const streamStatsSchema = z.object({
  streamId: z.number(),
  videoBitrate: z.number().optional(), // kbps
  audioBitrate: z.number().optional(), // kbps
  videoResolution: z.string().optional(), // e.g., "1920x1080"
  videoFrameRate: z.number().optional(), // fps
  audioSampleRate: z.number().optional(), // Hz
  audioChannels: z.number().optional(), // 1=mono, 2=stereo
  codec: z.string().optional(), // e.g., "h264"
  audioCodec: z.string().optional(), // e.g., "aac"
  timestamp: z.date()
});

export type StreamHealth = z.infer<typeof streamHealthSchema>;
export type StreamStats = z.infer<typeof streamStatsSchema>;