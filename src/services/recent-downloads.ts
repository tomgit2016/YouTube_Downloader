import { invoke } from '@tauri-apps/api/core';
import type { RecentDownload } from '../types';

export class RecentDownloadsService {
  /**
   * Get all recent downloads
   */
  static async getAll(): Promise<RecentDownload[]> {
    try {
      return await invoke<RecentDownload[]>('get_recent_downloads');
    } catch (error) {
      console.error('Failed to get recent downloads:', error);
      return [];
    }
  }

  /**
   * Add a download to recent downloads
   */
  static async add(download: RecentDownload): Promise<void> {
    try {
      const current = await this.getAll();
      const existingIndex = current.findIndex((d) => d.id === download.id);

      let updated;
      if (existingIndex >= 0) {
        updated = [...current];
        updated[existingIndex] = download;
      } else {
        updated = [download, ...current].slice(0, 100);
      }

      // Note: This would need a backend command to save the updated list
      // For now, we'll store it in localStorage as a fallback
      localStorage.setItem('recentDownloads', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to add recent download:', error);
    }
  }

  /**
   * Search recent downloads
   */
  static async search(query: string): Promise<RecentDownload[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return all.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.url.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Remove a download from recent downloads
   */
  static async remove(id: string): Promise<void> {
    try {
      const current = await this.getAll();
      const filtered = current.filter((d) => d.id !== id);
      localStorage.setItem('recentDownloads', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove recent download:', error);
    }
  }

  /**
   * Clear all recent downloads
   */
  static async clear(): Promise<void> {
    try {
      await invoke('clear_recent_downloads');
      localStorage.removeItem('recentDownloads');
    } catch (error) {
      console.error('Failed to clear recent downloads:', error);
    }
  }
}
