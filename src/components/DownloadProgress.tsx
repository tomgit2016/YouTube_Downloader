import React from 'react';
import { useAppStore } from '../stores/app-store';
import { formatFileSize } from '../utils/validation';

export const DownloadProgress: React.FC = () => {
  const { downloadQueue, activeDownloads, cancelDownload } = useAppStore();

  const activeItems = downloadQueue.filter((d) => d.status === 'downloading');

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div className="download-progress-container">
      <h2>Downloading</h2>
      {activeItems.map((item) => {
        const progress = activeDownloads.get(item.id);
        return (
          <div key={item.id} className="download-progress-item">
            <div className="progress-info">
              <h3 className="progress-title">{item.title}</h3>
              <div className="progress-meta">
                <span className="progress-speed">
                  {progress?.speed || '0 B/s'}
                </span>
                <span className="progress-eta">
                  ETA: {progress?.eta || '--:--'}
                </span>
              </div>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${item.progress}%` }}
              />
              <span className="progress-text">{item.progress.toFixed(1)}%</span>
            </div>
            <div className="progress-details">
              <span>{formatFileSize(item.progress * 1000000)}</span>
              <span> / </span>
              <span>{formatFileSize(item.progress * 1000000 / (item.progress / 100))}</span>
            </div>
            <button
              onClick={() => cancelDownload(item.id)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        );
      })}
    </div>
  );
};
