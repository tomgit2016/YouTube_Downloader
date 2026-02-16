export interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  uploader: string;
  thumbnail: string;
}

export interface VideoFormat {
  id: string;
  ext: string;
  resolution: string;
  fps: number;
  filesize?: number;
  vcodec: string;
  acodec: string;
}

export interface Subtitle {
  lang: string;
  name: string;
  format: string;
}

export interface DownloadOptions {
  url: string;
  format: string;
  output: string;
  subtitles: boolean;
  subtitleLangs?: string[];
  cookies?: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  speed: string;
  eta: string;
  downloaded: string;
  totalSize: string;
}

export interface RecentDownload {
  id: string;
  title: string;
  url: string;
  filePath: string;
  thumbnail: string;
  size: number;
  duration: number;
  quality: string;
  downloadedAt: string;
  format: string;
}

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  cookies: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  format: string;
  quality: string;
  outputPath: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  speed: string;
  eta: string;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiration?: number;
}

export interface SubtitleOptions {
  enabled: boolean;
  languages: string[];
  format: 'srt' | 'vtt' | 'ass';
}

export interface VideoQuality {
  id: string;
  label: string;
  resolution: string;
  format: string;
}
