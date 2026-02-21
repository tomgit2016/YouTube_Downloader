import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  VideoMetadata,
  VideoInfo,
  VideoFormat,
  Subtitle,
  DownloadProgress,
  RecentDownload,
  DownloadItem,
  SubtitleOptions,
  VideoQuality,
  User,
  Cookie,
} from '../types';

interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  cookies: Cookie[];

  // Download state
  currentUrl: string;
  videoMetadata: VideoMetadata | null;
  videoInfo: VideoInfo | null;
  availableFormats: VideoFormat[];
  availableSubtitles: Subtitle[];
  selectedQuality: VideoQuality | null;
  selectedSubtitles: SubtitleOptions;
  saveLocation: string;

  // Queue state
  downloadQueue: DownloadItem[];
  activeDownloads: Map<string, DownloadProgress>;

  // Recent downloads state
  recentDownloads: RecentDownload[];
  searchQuery: string;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setUrl: (url: string) => void;
  setVideoMetadata: (metadata: VideoMetadata | null) => void;
  setVideoInfo: (info: VideoInfo | null) => void;
  setAvailableFormats: (formats: VideoFormat[]) => void;
  setAvailableSubtitles: (subtitles: Subtitle[]) => void;
  setQuality: (quality: VideoQuality | null) => void;
  setSubtitles: (options: SubtitleOptions) => void;
  setSaveLocation: (path: string) => void;
  addToQueue: (item: DownloadItem) => void;
  removeFromQueue: (id: string) => void;
  updateDownloadProgress: (id: string, progress: DownloadProgress) => void;
  startDownload: (id: string) => void;
  cancelDownload: (id: string) => Promise<void>;
  loadRecentDownloads: () => Promise<void>;
  addRecentDownload: (download: RecentDownload) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openFileWith: (path: string, appPath?: string) => Promise<void>;
  getAppsForFile: (path: string) => Promise<Array<[string, string, string]>>;
  openInFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  clearRecentDownloads: () => Promise<void>;
  removeRecentDownload: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  cookies: [],
  currentUrl: '',
  videoMetadata: null,
  videoInfo: null,
  availableFormats: [],
  availableSubtitles: [],
  selectedQuality: null,
  selectedSubtitles: {
    enabled: false,
    languages: [],
    format: 'srt',
  },
  saveLocation: '',
  downloadQueue: [],
  activeDownloads: new Map(),
  recentDownloads: [],
  searchQuery: '',
  isLoading: false,
  error: null,

  // Actions
  setUrl: (url) => set({ currentUrl: url }),

  setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),

  setVideoInfo: (info) => set({ videoInfo: info }),

  setAvailableFormats: (formats) => set({ availableFormats: formats }),

  setAvailableSubtitles: (subtitles) => set({ availableSubtitles: subtitles }),

  setQuality: (quality) => set({ selectedQuality: quality }),

  setSubtitles: (options) => set({ selectedSubtitles: options }),

  setSaveLocation: (path) => set({ saveLocation: path }),

  addToQueue: (item) => {
    console.log('Adding to queue:', item);
    set((state) => ({
      downloadQueue: [item, ...state.downloadQueue],
    }));
  },

  removeFromQueue: (id) => set((state) => ({
    downloadQueue: state.downloadQueue.filter((item) => item.id !== id),
  })),

  updateDownloadProgress: (id, progress) => set((state) => {
    const newActiveDownloads = new Map(state.activeDownloads);
    newActiveDownloads.set(id, progress);
    return { activeDownloads: newActiveDownloads };
  }),

  startDownload: async (id) => {
    const state = get();
    const item = state.downloadQueue.find((d) => d.id === id);
    console.log('startDownload called, id:', id, 'item:', item);
    if (!item) return;

    // Capture video info now before it might change
    const videoInfo = state.videoInfo;

    // Update item status
    set((state) => {
      console.log('Setting status to downloading for:', id);
      return {
        downloadQueue: state.downloadQueue.map((d) =>
          d.id === id ? { ...d, status: 'downloading' as const } : d
        ),
      };
    });

    try {
      console.log('Invoking start_download...');
      const downloadId = await invoke<string>('start_download', {
        options: {
          url: item.url,
          format: item.format,
          output: item.outputPath,
          subtitles: false,
        },
      });
      console.log('Got downloadId from backend:', downloadId);

      // Listen for progress updates
      const unlistenProgress = await listen('download-progress', (event: any) => {
        const payload = event.payload;
        console.log('Progress event:', payload);
        if (payload.id === downloadId) {
          set((state) => ({
            downloadQueue: state.downloadQueue.map((d) =>
              d.id === id ? { 
                ...d, 
                progress: payload.progress,
                speed: payload.speed || d.speed,
                eta: payload.eta || d.eta
              } : d
            ),
          }));
        }
      });

      // Listen for download complete event
      const unlisten = await listen('download-complete', async (event) => {
        console.log('Download complete event:', event.payload);
        if (event.payload === downloadId) {
          // Get file size
          let fileSize = 0;
          try {
            fileSize = await invoke<number>('get_file_size', { path: item.outputPath });
          } catch (err) {
            console.error('Failed to get file size:', err);
          }

          const completedAt = new Date().toISOString();
          
          set((state) => ({
            downloadQueue: state.downloadQueue.map((d) =>
              d.id === id ? { 
                ...d, 
                status: 'completed' as const, 
                progress: 100,
                downloadedAt: completedAt,
                size: fileSize,
                duration: videoInfo?.duration || d.duration || 0
              } : d
            ),
            // Clear URL input when download completes
            currentUrl: '',
            videoMetadata: null,
            videoInfo: null,
            availableFormats: [],
            selectedQuality: null,
          }));

          // Add to recent downloads
          try {
            await get().addRecentDownload({
              id: item.id,
              title: item.title,
              url: item.url,
              filePath: item.outputPath,
              thumbnail: videoInfo?.thumbnail || '',
              size: fileSize,
              duration: videoInfo?.duration || 0,
              quality: item.quality,
              downloadedAt: completedAt,
              format: item.format,
            });
          } catch (err) {
            console.error('Failed to save recent download:', err);
          }

          unlistenProgress();
          unlisten();
        }
      });
    } catch (error) {
      console.error('startDownload error:', error);
      set((state) => ({
        downloadQueue: state.downloadQueue.map((d) =>
          d.id === id ? { ...d, status: 'failed' as const, error: String(error) } : d
        ),
      }));
    }
  },

  cancelDownload: async (id) => {
    try {
      await invoke('cancel_download', { id });
      set((state) => ({
        downloadQueue: state.downloadQueue.map((d) =>
          d.id === id ? { ...d, status: 'pending' as const } : d
        ),
      }));
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  },

  loadRecentDownloads: async () => {
    try {
      const downloads = await invoke<RecentDownload[]>('get_recent_downloads');
      set({ recentDownloads: downloads });
    } catch (error) {
      console.error('Failed to load recent downloads:', error);
    }
  },

  addRecentDownload: async (download) => {
    try {
      console.log('Saving recent download:', download);
      // Save to backend (persists to disk)
      await invoke('save_recent_download', { download });
      console.log('Successfully saved to backend');
      
      // Update local state
      const current = get().recentDownloads;
      const existingIndex = current.findIndex((d) => d.id === download.id);

      let updated;
      if (existingIndex >= 0) {
        updated = [...current];
        updated[existingIndex] = download;
      } else {
        updated = [download, ...current].slice(0, 100);
      }

      set({ recentDownloads: updated });
      console.log('Updated local state, recentDownloads count:', updated.length);
    } catch (error) {
      console.error('Failed to add recent download:', error);
    }
  },

  openFile: async (path) => {
    try {
      await invoke('open_file', { path });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  },

  openFileWith: async (path, appPath) => {
    try {
      await invoke('open_file_with', { path, appPath });
    } catch (error) {
      console.error('Failed to open file with:', error);
    }
  },

  getAppsForFile: async (path) => {
    try {
      return await invoke<Array<[string, string, string]>>('get_apps_for_file', { path });
    } catch (error) {
      console.error('Failed to get apps for file:', error);
      return [];
    }
  },

  openInFolder: async (path) => {
    try {
      await invoke('open_in_folder', { path });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  },

  deleteFile: async (path) => {
    try {
      // Find the download to get its ID before deleting
      const state = get();
      const download = state.recentDownloads.find((d) => d.filePath === path);
      
      // Delete the file from disk
      await invoke('delete_file', { path });
      
      // Remove from backend storage if found
      if (download) {
        await invoke('remove_recent_download', { id: download.id });
      }
      
      // Remove from local state
      set((state) => ({
        recentDownloads: state.recentDownloads.filter((d) => d.filePath !== path),
        downloadQueue: state.downloadQueue.filter((d) => d.outputPath !== path),
      }));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  },

  clearRecentDownloads: async () => {
    try {
      await invoke('clear_recent_downloads');
      set({ recentDownloads: [] });
    } catch (error) {
      console.error('Failed to clear recent downloads:', error);
    }
  },

  removeRecentDownload: async (id) => {
    try {
      await invoke('remove_recent_download', { id });
      set((state) => ({
        recentDownloads: state.recentDownloads.filter((d) => d.id !== id),
      }));
    } catch (error) {
      console.error('Failed to remove recent download:', error);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));
