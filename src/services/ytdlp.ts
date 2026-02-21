import { invoke } from '@tauri-apps/api/core';
import type {
  VideoInfo,
  VideoFormat,
  Subtitle,
  DownloadOptions,
  DownloadProgress,
} from '../types';

interface CombinedVideoInfo {
  info: VideoInfo;
  formats: VideoFormat[];
  subtitles: Subtitle[];
}

export class YtDlpService {
  /**
   * Get video info, formats, and subtitles in a single call (faster)
   */
  static async getVideoInfoCombined(url: string): Promise<CombinedVideoInfo> {
    return await invoke<CombinedVideoInfo>('get_video_info_combined', { url });
  }

  /**
   * Get video info with automatic cookie refresh on auth errors
   */
  static async getVideoInfoWithRefresh(url: string): Promise<CombinedVideoInfo> {
    return await invoke<CombinedVideoInfo>('get_video_info_with_refresh', { url });
  }

  /**
   * Get video information from YouTube URL
   */
  static async getVideoInfo(url: string): Promise<VideoInfo> {
    return await invoke<VideoInfo>('get_video_info', { url });
  }

  /**
   * Get available video formats
   */
  static async getFormats(url: string): Promise<VideoFormat[]> {
    return await invoke<VideoFormat[]>('get_available_formats', { url });
  }

  /**
   * Get available subtitles
   */
  static async getSubtitles(url: string): Promise<Subtitle[]> {
    return await invoke<Subtitle[]>('get_available_subtitles', { url });
  }

  /**
   * Start a download
   */
  static async download(options: DownloadOptions): Promise<string> {
    return await invoke<string>('start_download', { options });
  }

  /**
   * Cancel a download
   */
  static async cancelDownload(id: string): Promise<void> {
    await invoke('cancel_download', { id });
  }

  /**
   * Get download progress
   */
  static async getProgress(id: string): Promise<DownloadProgress> {
    return await invoke<DownloadProgress>('get_download_progress', { id });
  }

  /**
   * Validate YouTube URL
   */
  static async validateUrl(url: string): Promise<{ valid: boolean; metadata?: any }> {
    try {
      const metadata = await invoke<any>('validate_url', { url });
      return { valid: true, metadata };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Refresh cookies from browser
   * @param browser - Browser to extract cookies from (default: 'chrome')
   */
  static async refreshCookies(browser?: string): Promise<void> {
    await invoke('refresh_cookies', { browser: browser || null });
  }
}
