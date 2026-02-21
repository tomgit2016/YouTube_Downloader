import React, { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { YtDlpService } from '../services/ytdlp';
import { isValidYouTubeUrl } from '../utils/validation';

export const URLInput: React.FC = () => {
  const { currentUrl, setUrl, setVideoInfo, setAvailableFormats, setAvailableSubtitles, setIsLoading, isLoading, setError, setQuality } = useAppStore();
  const [isValid, setIsValid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setUrl(url);

    const valid = isValidYouTubeUrl(url);
    setIsValid(valid);

    if (valid) {
      await fetchVideoInfo(url);
    } else {
      setVideoInfo(null);
      setAvailableFormats([]);
      setAvailableSubtitles([]);
    }
  };

  const handleClear = () => {
    setUrl('');
    setIsValid(false);
    setVideoInfo(null);
    setAvailableFormats([]);
    setAvailableSubtitles([]);
    setQuality(null);
    setError(null);
  };

  const fetchVideoInfo = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use auto-refresh endpoint that will refresh cookies on auth errors
      const result = await YtDlpService.getVideoInfoWithRefresh(url);
      setVideoInfo(result.info);
      setAvailableFormats(result.formats);
      setAvailableSubtitles(result.subtitles);
    } catch (error) {
      setError(String(error));
      console.error('Failed to fetch video info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCookies = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      await YtDlpService.refreshCookies('chrome');
      // If there's a valid URL, retry fetching
      if (isValid && currentUrl) {
        await fetchVideoInfo(currentUrl);
      }
    } catch (error) {
      setError(`Failed to refresh cookies: ${error}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="url-input-container">
      <div className="input-group">
        <input
          type="text"
          placeholder="Paste YouTube URL here..."
          value={currentUrl}
          onChange={handleUrlChange}
          className={`url-input ${isValid ? 'valid' : ''}`}
          disabled={isLoading || isRefreshing}
        />
        <div className="url-actions">
          {(isLoading || isRefreshing) && (
            <div className="url-status loading">
              <svg width="20" height="20" viewBox="0 0 20 20" className="spinner">
                <circle cx="10" cy="10" r="8" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            </div>
          )}
          {!isLoading && !isRefreshing && isValid && (
            <div className="url-status valid">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="#10b981" strokeWidth="2" />
                <path d="M6 10L9 13L14 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {currentUrl && !isLoading && !isRefreshing && (
            <button 
              type="button" 
              className="clear-url-button" 
              onClick={handleClear}
              title="Clear URL"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="url-input-footer">
        {isLoading && (
          <div className="loading-text">Fetching video info...</div>
        )}
        {isRefreshing && (
          <div className="loading-text">Refreshing cookies from Chrome...</div>
        )}
        <button
          type="button"
          className="refresh-cookies-button"
          onClick={handleRefreshCookies}
          disabled={isLoading || isRefreshing}
          title="Refresh cookies from Chrome browser"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 2V5L10.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh Cookies
        </button>
      </div>
    </div>
  );
};
