import OpenAI from 'openai';
import { STTResult } from '../types';

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export interface RecordingEventHandlers {
  onStateChange?: (state: RecordingState) => void;
  onError?: (error: Error) => void;
  onTranscriptionComplete?: (result: STTResult) => void;
}

export class RecordingService {
  private static instance: RecordingService | null = null;
  private state: RecordingState = RecordingState.IDLE;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private eventHandlers: RecordingEventHandlers = {};
  private recordingStartTime: Date | null = null;

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

  public getState(): RecordingState {
    return this.state;
  }

  public isRecording(): boolean {
    return this.state === RecordingState.RECORDING;
  }

  private setState(newState: RecordingState): void {
    if (this.state !== newState) {
      this.state = newState;
      console.log(`Recording state changed: ${newState}`);
      this.eventHandlers.onStateChange?.(newState);
    }
  }

  private handleError(error: Error): void {
    console.error('Recording error:', error);
    this.setState(RecordingState.ERROR);
    this.cleanup();
    this.eventHandlers.onError?.(error);
  }

  public async startRecording(): Promise<void> {
    if (this.state !== RecordingState.IDLE) {
      throw new Error(`Cannot start recording: current state is ${this.state}`);
    }

    try {
      console.log('🎤 Requesting microphone access...');
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      // Setup event handlers
      this.setupMediaRecorderEvents();

      // Start recording
      this.audioChunks = [];
      this.recordingStartTime = new Date();
      this.mediaRecorder.start(100); // Collect data every 100ms
      
      this.setState(RecordingState.RECORDING);
      console.log('✅ Recording started successfully');

    } catch (error) {
      this.handleError(new Error(`Failed to start recording: ${error.message}`));
      throw error;
    }
  }

  public async stopRecording(): Promise<void> {
    if (this.state !== RecordingState.RECORDING) {
      throw new Error(`Cannot stop recording: current state is ${this.state}`);
    }

    try {
      console.log('🛑 Stopping recording...');
      
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      
      this.setState(RecordingState.PROCESSING);

    } catch (error) {
      this.handleError(new Error(`Failed to stop recording: ${error.message}`));
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
      console.log('📁 Recording stopped, processing audio...');
      this.processRecording();
    };

    this.mediaRecorder.onerror = (event) => {
      this.handleError(new Error(`MediaRecorder error: ${event.error?.message || 'Unknown error'}`));
    };
  }

  private currentAudioBlob: Blob | null = null;
  private currentAudioPath: string | null = null;

  private async processRecording(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        throw new Error('No audio data recorded');
      }

      // Create audio blob
      const mimeType = this.getSupportedMimeType();
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      
      console.log('📊 Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeKB: Math.round(audioBlob.size / 1024)
      });

      if (audioBlob.size === 0) {
        throw new Error('Recorded audio is empty');
      }

      // Store the audio blob for later transcription
      this.currentAudioBlob = audioBlob;
      this.currentAudioPath = null;

      // Clean up resources
      this.cleanup();

      // Set to idle state 
      this.setState(RecordingState.IDLE);

      console.log('🎵 Recording processing complete, ready for transcription');

    } catch (error) {
      this.handleError(new Error(`Failed to process recording: ${error.message}`));
    }
  }

  public async transcribeLatestRecording(apiKey: string, language = 'ja', saveAudioFile = false): Promise<{ result: STTResult; audioFilePath?: string }> {
    if (!this.currentAudioBlob) {
      throw new Error('No recording available for transcription');
    }

    let audioFilePath: string | undefined;
    
    if (saveAudioFile) {
      audioFilePath = await this.saveAudioFileViaIPC(this.currentAudioBlob);
      this.currentAudioPath = audioFilePath;
    }

    const result = await this.transcribeAudio(this.currentAudioBlob, apiKey, language);
    
    this.currentAudioBlob = null;
    return { result, audioFilePath };
  }

  public getLastAudioFilePath(): string | null {
    return this.currentAudioPath;
  }

  public getRecordingDuration(): number | null {
    if (!this.recordingStartTime) return null;
    const endTime = new Date();
    return Math.round((endTime.getTime() - this.recordingStartTime.getTime()) / 1000);
  }

  private async saveAudioFileViaIPC(audioBlob: Blob): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const result = await window.electronAPI.saveAudioFile({
      data: Array.from(uint8Array),
      mimeType: audioBlob.type
    });
    
    console.log('💾 Audio file saved:', result.filePath);
    return result.filePath;
  }

  public async transcribeAudio(audioBlob: Blob, apiKey: string, language = 'ja'): Promise<STTResult> {
    try {
      if (!apiKey || !apiKey.startsWith('sk-')) {
        // Mock implementation for testing
        console.log('Using mock transcription service');
        return {
          text: "これはテスト用の音声認識結果です。実際のAPIキーを設定すると、OpenAI Whisperが使用されます。",
          language: language,
          confidence: 0.95
        };
      }

      console.log('🤖 Starting transcription with OpenAI Whisper...');
      
      const openai = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true
      });

      // Create File object from Blob
      const filename = `recording-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], filename, {
        type: audioBlob.type
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language === 'auto' ? undefined : language,
        response_format: 'json'
      });

      const result: STTResult = {
        text: transcription.text,
        language: language,
        confidence: 0.95
      };

      console.log('✅ Transcription successful:', result.text);
      this.eventHandlers.onTranscriptionComplete?.(result);
      
      return result;

    } catch (error) {
      console.error('Transcription failed:', error);
      const errorMessage = error.message || 'Unknown transcription error';
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Using MIME type: ${type}`);
        return type;
      }
    }

    console.warn('No preferred MIME type supported, using default');
    return 'audio/webm';
  }

  private cleanup(): void {
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    // Clean up MediaRecorder
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Reset recording time but keep audio path for history
    this.recordingStartTime = null;
  }

  public forceReset(): void {
    console.log('🔄 Force resetting recording service...');
    this.cleanup();
    this.setState(RecordingState.IDLE);
    this.currentAudioPath = null;
    this.recordingStartTime = null;
  }
}