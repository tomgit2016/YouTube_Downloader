import React, { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { YtDlpService } from '../services/ytdlp';
import { isValidYouTubeUrl } from '../utils/validation';

export const URLInput: React.FC = () => {
  const { currentUrl, setUrl, setVideoInfo, setAvailableFormats, setAvailableSubtitles, setIsLoading, isLoading, setError, setQuality } = useAppStore();
  const [isValid, setIsValid] = useState(false);

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
      // Use combined fetch for faster loading
      const result = await YtDlpService.getVideoInfoCombined(url);
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

  return (
    <div className="url-input-container">
      <div className="input-group">
        <input
          type="text"
          placeholder="Paste YouTube URL here..."
          value={currentUrl}
          onChange={handleUrlChange}
          className={`url-input ${isValid ? 'valid' : ''}`}
          disabled={isLoading}
        />
        <div className="url-actions">
          {isLoading && (
            <div className="url-status loading">
              <svg width="20" height="20" viewBox="0 0 20 20" className="spinner">
                <circle cx="10" cy="10" r="8" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            </div>
          )}
          {!isLoading && isValid && (
            <div className="url-status valid">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="#10b981" strokeWidth="2" />
                <path d="M6 10L9 13L14 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {currentUrl && !isLoading && (
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
      {isLoading && (
        <div className="loading-text">Fetching video info...</div>
      )}
    </div>
  );
};
