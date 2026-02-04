import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { URLInput } from './components/URLInput';
import { QualitySelector } from './components/QualitySelector';
import { SubtitleOptions } from './components/SubtitleOptions';
import { SaveLocationPicker } from './components/SaveLocationPicker';
import { RecentDownloads } from './components/RecentDownloads';
import { generateOutputPath } from './utils/formatting';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

function App() {
  const {
    videoInfo,
    selectedQuality,
    saveLocation,
    setSaveLocation,
    addToQueue,
    startDownload,
    error,
    setError,
    loadRecentDownloads,
  } = useAppStore();

  useEffect(() => {
    // Initialize save location
    invoke<string>('select_save_location').then(setSaveLocation);
    loadRecentDownloads();
  }, [loadRecentDownloads]);

  const handleDownload = async () => {
    if (!videoInfo || !selectedQuality || !saveLocation) {
      setError('Please select a video, quality, and save location');
      return;
    }

    // Always use mp4 since we force merge to mp4 in backend
    const outputPath = generateOutputPath(
      videoInfo.title,
      'mp4',
      saveLocation
    );

    const downloadItem = {
      id: crypto.randomUUID(),
      url: useAppStore.getState().currentUrl,
      title: videoInfo.title,
      format: 'mp4',
      quality: selectedQuality.resolution,
      outputPath,
      status: 'pending' as const,
      progress: 0,
      speed: '0 B/s',
      eta: '--:--',
    };

    addToQueue(downloadItem);
    startDownload(downloadItem.id);
    setError(null);
  };

  const canDownload = videoInfo && selectedQuality && saveLocation;

  return (
    <div className="app">
      <header className="app-header">
        <h1>YouTube Downloader</h1>
      </header>

      <main className="app-main">
        <div className="download-section">
          <URLInput />

          {videoInfo && (
            <div className="video-info">
              {videoInfo.thumbnail && (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="video-thumbnail"
                />
              )}
              <div className="video-details">
                <h2 className="video-title">{videoInfo.title}</h2>
                <p className="video-uploader">by {videoInfo.uploader}</p>
                <p className="video-duration">
                  {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          )}

          <QualitySelector />
          <SubtitleOptions />
          <SaveLocationPicker />

          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className="download-button"
          >
            Download
          </button>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="close-error">×</button>
            </div>
          )}
        </div>

        <div className="sidebar">
          <RecentDownloads />
        </div>
      </main>
    </div>
  );
}

export default App;
