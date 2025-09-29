import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import NodeMediaServer from "node-media-server";
import { insertStreamSchema, streamHealthSchema, insertStreamOutputSchema, streamStatsSchema, insertRecordingSchema } from "@shared/schema";
import { generateThumbnail, getThumbnailPath } from "./thumbnail";
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSocket server for webcam streaming
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      // Handle incoming webcam stream data
      if (ws.readyState === ws.OPEN) {
        // Process and forward webcam data to RTMP server
        // This will be implemented in the next step
      }
    });
  });

  // Setup RTMP server
  const nms = new NodeMediaServer({
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: 8000,
      mediaroot: './media',
      allow_origin: '*'
    },
    trans: {
      ffmpeg: 'ffmpeg',
      tasks: [
        {
          app: 'live',
          hls: true,
          hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]'
        }
      ]
    }
  });

  nms.run();

  // Set up thumbnail generation for active streams
  setInterval(async () => {
    const streams = await storage.getAllStreams();
    for (const stream of streams) {
      if (stream.isActive) {
        const thumbnail = await generateThumbnail(stream.streamKey);
        if (thumbnail) {
          await storage.updateThumbnailTimestamp(stream.id);
        }
      }
    }
  }, 10000);

  // Stream management endpoints
  app.get("/api/streams", async (_req, res) => {
    const streams = await storage.getAllStreams();
    res.json(streams);
  });

  app.post("/api/streams", async (req, res) => {
    const result = insertStreamSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const stream = await storage.createStream(result.data);
    res.json(stream);
  });

  // Add delete stream endpoint
  app.delete("/api/streams/:id", async (req, res) => {
    try {
      await storage.deleteStream(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: "Stream not found" });
    }
  });

  app.get("/api/streams/:streamKey/thumbnail", (req, res) => {
    const thumbnailPath = getThumbnailPath(req.params.streamKey);
    if (fs.existsSync(thumbnailPath)) {
      res.sendFile(path.resolve(thumbnailPath));
    } else {
      res.status(404).send('Thumbnail not found');
    }
  });

  app.post("/api/streams/:id/health", async (req, res) => {
    const result = streamHealthSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const stream = await storage.updateStreamHealth(
      parseInt(req.params.id),
      result.data.health
    );
    res.json(stream);
  });

  app.post("/api/streams/:id/active", async (req, res) => {
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be boolean" });
    }
    const stream = await storage.setStreamActive(parseInt(req.params.id), active);
    res.json(stream);
  });

  // Stream output routes
  app.get("/api/streams/:id/outputs", async (req, res) => {
    try {
      const outputs = await storage.getStreamOutputs(parseInt(req.params.id));
      res.json(outputs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch outputs" });
    }
  });

  app.post("/api/streams/:id/outputs", async (req, res) => {
    const result = insertStreamOutputSchema.safeParse({
      ...req.body,
      streamId: parseInt(req.params.id)
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    try {
      const output = await storage.createStreamOutput(result.data);
      res.json(output);
    } catch (error) {
      res.status(500).json({ error: "Failed to create output" });
    }
  });

  app.delete("/api/outputs/:id", async (req, res) => {
    try {
      await storage.deleteStreamOutput(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: "Output not found" });
    }
  });

  app.post("/api/outputs/:id/enabled", async (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled must be boolean" });
    }
    try {
      const output = await storage.setOutputEnabled(parseInt(req.params.id), enabled);
      res.json(output);
    } catch (error) {
      res.status(404).json({ error: "Output not found" });
    }
  });

  // Stream statistics routes
  app.get("/api/streams/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getStreamStats(parseInt(req.params.id));
      if (!stats) {
        return res.status(404).json({ error: "Stream stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stream stats" });
    }
  });

  app.post("/api/streams/:id/stats", async (req, res) => {
    const result = streamStatsSchema.safeParse({
      ...req.body,
      streamId: parseInt(req.params.id),
      timestamp: new Date()
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    try {
      await storage.updateStreamStats(parseInt(req.params.id), result.data);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to update stream stats" });
    }
  });

  // Recording routes
  app.post("/api/streams/:id/recordings/start", async (req, res) => {
    try {
      const stream = await storage.getStream(parseInt(req.params.id));
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      if (!stream.recordingEnabled) {
        return res.status(400).json({ error: "Recording not enabled for this stream" });
      }
      
      const recording = await storage.createRecording({
        streamId: stream.id,
        name: `${stream.name} - ${new Date().toISOString()}`,
        filename: `recording-${stream.id}-${Date.now()}.${stream.recordingFormat}`,
        quality: stream.recordingQuality!,
        format: stream.recordingFormat!,
        startedAt: new Date()
      });
      
      res.json(recording);
    } catch (error) {
      res.status(500).json({ error: "Failed to start recording" });
    }
  });

  app.get("/api/recordings", async (req, res) => {
    try {
      const streamId = req.query.streamId ? parseInt(req.query.streamId as string) : undefined;
      const recordings = await storage.getRecordings(streamId);
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings/:id", async (req, res) => {
    try {
      const recording = await storage.getRecording(parseInt(req.params.id));
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.json(recording);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recording" });
    }
  });

  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const recording = await storage.getRecording(parseInt(req.params.id));
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      
      // Delete file if it exists
      const filePath = path.join('./recordings', recording.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteRecording(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  app.get("/api/recordings/:id/download", async (req, res) => {
    try {
      const recording = await storage.getRecording(parseInt(req.params.id));
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      
      const filePath = path.join('./recordings', recording.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Recording file not found" });
      }
      
      res.download(filePath, recording.name + '.' + recording.format);
    } catch (error) {
      res.status(500).json({ error: "Failed to download recording" });
    }
  });

  app.post("/api/streams/:id/recording-settings", async (req, res) => {
    const { recordingEnabled, recordingQuality, recordingFormat } = req.body;
    
    if (typeof recordingEnabled !== "boolean") {
      return res.status(400).json({ error: "recordingEnabled must be boolean" });
    }
    
    try {
      const stream = await storage.updateStreamRecordingSettings(parseInt(req.params.id), {
        recordingEnabled,
        recordingQuality,
        recordingFormat
      });
      res.json(stream);
    } catch (error) {
      res.status(404).json({ error: "Stream not found" });
    }
  });

  return httpServer;
}