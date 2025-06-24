import OpenAI from "openai";

import { STTResult } from "../types";

export enum RecordingState {
  IDLE = "idle",
  RECORDING = "recording",
  PROCESSING = "processing",
  ERROR = "error",
}

export interface RecordingEventHandlers {
  onStateChange?: (state: RecordingState) => void;
  onError?: (error: Error) => void;
  onTranscriptionComplete?: (result: STTResult, audioFilePath?: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class RecordingService {
  private static instance: RecordingService | null = null;
  private state: RecordingState = RecordingState.IDLE;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private eventHandlers: RecordingEventHandlers = {};
  private recordingStartTime: Date | null = null;
  
  // Audio visualization components
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private dataArray: Uint8Array | null = null;
  
  // Settings for automatic transcription
  private transcriptionSettings: {
    apiKey: string;
    language: string;
    saveAudioFiles: boolean;
  } | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  public setEventHandlers(handlers: RecordingEventHandlers): void {
    this.eventHandlers = handlers;
  }

  public setTranscriptionSettings(apiKey: string, language = "ja", saveAudioFiles = false): void {
    this.transcriptionSettings = { apiKey, language, saveAudioFiles };
  }

  public getState(): RecordingState {
    return this.state;
  }

  public isRecording(): boolean {
    return this.state === RecordingState.RECORDING;
  }

  private setState(newState: RecordingState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.eventHandlers.onStateChange?.(newState);
    }
  }

  private handleError(error: Error): void {
    this.setState(RecordingState.ERROR);
    this.cleanup();
    this.eventHandlers.onError?.(error);
  }

  public async startRecording(): Promise<void> {
    if (this.state !== RecordingState.IDLE) {
      throw new Error(`Cannot start recording: current state is ${this.state}`);
    }

    try {

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      // Setup event handlers
      this.setupMediaRecorderEvents();

      // Setup audio visualization
      this.setupAudioVisualization();

      // Start recording
      this.audioChunks = [];
      this.recordingStartTime = new Date();
      this.mediaRecorder.start(100); // Collect data every 100ms

      this.setState(RecordingState.RECORDING);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.handleError(new Error(`Failed to start recording: ${errorMessage}`));
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    if (this.state !== RecordingState.RECORDING) {
      throw new Error(`Cannot stop recording: current state is ${this.state}`);
    }

    try {

      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
      }

      // Stop audio visualization
      this.stopAudioVisualization();

      this.setState(RecordingState.PROCESSING);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.handleError(new Error(`Failed to stop recording: ${errorMessage}`));
      throw error;
    }
  }

  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processRecording();
    };

    this.mediaRecorder.onerror = (event) => {
      this.handleError(
        new Error(
          `MediaRecorder error: ${event.error?.message || "Unknown error"}`
        )
      );
    };
  }

  private currentAudioBlob: Blob | null = null;
  private currentAudioPath: string | null = null;

  private async processRecording(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        throw new Error("No audio data recorded");
      }

      // Create audio blob
      const mimeType = this.getSupportedMimeType();
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });


      if (audioBlob.size === 0) {
        throw new Error("Recorded audio is empty");
      }

      // Store the audio blob for later transcription
      this.currentAudioBlob = audioBlob;
      this.currentAudioPath = null;

      // Clean up recording resources but keep processing state
      this.cleanupRecordingResources();

      
      // Automatically start transcription if settings are available
      if (this.transcriptionSettings) {
        await this.performTranscription();
      } else {
        this.setState(RecordingState.IDLE);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.handleError(
        new Error(`Failed to process recording: ${errorMessage}`)
      );
    }
  }

  private async performTranscription(): Promise<void> {
    if (!this.currentAudioBlob || !this.transcriptionSettings) {
      throw new Error("No audio data or transcription settings available");
    }

    try {
      
      let audioFilePath: string | undefined;

      if (this.transcriptionSettings.saveAudioFiles) {
        audioFilePath = await this.saveAudioFileViaIPC(this.currentAudioBlob);
        this.currentAudioPath = audioFilePath;
      }

      const result = await this.transcribeAudio(
        this.currentAudioBlob,
        this.transcriptionSettings.apiKey,
        this.transcriptionSettings.language
      );

      // Clear the audio blob after successful transcription
      this.currentAudioBlob = null;
      
      // Notify completion via handler
      this.eventHandlers.onTranscriptionComplete?.(result, audioFilePath);
      
      // Transition to IDLE state after handler notification
      this.setState(RecordingState.IDLE);
      
    } catch (error) {
      // Handle transcription errors
      this.currentAudioBlob = null;
      this.setState(RecordingState.ERROR);
      throw error;
    }
  }

  public async transcribeLatestRecording(
    apiKey: string,
    language = "ja",
    saveAudioFile = false
  ): Promise<{ result: STTResult; audioFilePath?: string }> {
    if (!this.currentAudioBlob) {
      throw new Error("No recording available for transcription");
    }

    try {
      let audioFilePath: string | undefined;

      if (saveAudioFile) {
        audioFilePath = await this.saveAudioFileViaIPC(this.currentAudioBlob);
        this.currentAudioPath = audioFilePath;
      }

      const result = await this.transcribeAudio(
        this.currentAudioBlob,
        apiKey,
        language
      );

      // Clear the audio blob after successful transcription
      
      // Notify completion via handler BEFORE state transition
      this.eventHandlers.onTranscriptionComplete?.(result, audioFilePath);
      
      // Transition to IDLE state after handler notification
      this.setState(RecordingState.IDLE);
      
      return { result, audioFilePath };
    } catch (error) {
      // Handle transcription errors
      this.currentAudioBlob = null;
      this.setState(RecordingState.ERROR);
      throw error;
    }
  }

  public getLastAudioFilePath(): string | null {
    return this.currentAudioPath;
  }

  public getRecordingDuration(): number | null {
    if (!this.recordingStartTime) return null;
    const endTime = new Date();
    return Math.round(
      (endTime.getTime() - this.recordingStartTime.getTime()) / 1000
    );
  }

  private async saveAudioFileViaIPC(audioBlob: Blob): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const result = await window.electronAPI.saveAudioFile({
      data: Array.from(uint8Array),
      mimeType: audioBlob.type,
    });

    return result.filePath;
  }

  public async transcribeAudio(
    audioBlob: Blob,
    apiKey: string,
    language = "ja"
  ): Promise<STTResult> {
    try {
      if (!apiKey || !apiKey.startsWith("sk-")) {
        throw new Error("Valid OpenAI API key is not configured.");
      }


      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Create File object from Blob
      const filename = `recording-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], filename, {
        type: audioBlob.type,
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language === "auto" ? undefined : language,
        response_format: "json",
      });

      const result: STTResult = {
        text: transcription.text,
        language: language,
        confidence: 0.95,
      };


      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "audio/webm";
  }

  private cleanupRecordingResources(): void {
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.mediaStream = null;
    }

    // Clean up MediaRecorder
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private cleanup(): void {
    this.cleanupRecordingResources();
    this.stopAudioVisualization();
    
    // Reset recording time but keep audio path for history
    this.recordingStartTime = null;
  }

  public forceReset(): void {
    this.cleanup();
    this.setState(RecordingState.IDLE);
    this.currentAudioPath = null;
    this.recordingStartTime = null;
  }

  // Audio visualization methods
  private setupAudioVisualization(): void {
    if (!this.mediaStream) return;

    try {
      // Create audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      
      // Start the audio level monitoring loop
      this.startAudioLevelMonitoring();
    } catch (error) {
      console.warn('Failed to setup audio visualization:', error);
    }
  }

  private startAudioLevelMonitoring(): void {
    if (!this.analyser || !this.dataArray) return;

    const monitorAudioLevel = () => {
      if (this.state !== RecordingState.RECORDING || !this.analyser || !this.dataArray) {
        return;
      }

      // Get frequency data
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average amplitude
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / this.dataArray.length;
      
      // Normalize to 0-1 range and apply some smoothing
      const normalizedLevel = Math.min(average / 128, 1);
      
      // Notify listeners of the audio level
      this.eventHandlers.onAudioLevel?.(normalizedLevel);
      
      // Continue monitoring
      this.animationFrameId = requestAnimationFrame(monitorAudioLevel);
    };

    monitorAudioLevel();
  }

  private stopAudioVisualization(): void {
    // Stop animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.warn('Failed to close audio context:', error);
      });
    }
    
    // Reset audio visualization components
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
  }
}
