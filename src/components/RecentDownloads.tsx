import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { formatDuration, formatDate } from '../utils/validation';

export const RecentDownloads: React.FC = () => {
  const { 
    downloadQueue, 
    recentDownloads, 
    searchQuery, 
    openFile, 
    openInFolder, 
    deleteFile, 
    loadRecentDownloads,
    cancelDownload 
  } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; download: any; isActive: boolean } | null>(null);

  useEffect(() => {
    loadRecentDownloads();
  }, [loadRecentDownloads]);

  // Combine active downloads and recent downloads
  const activeDownloads = downloadQueue.filter(d => 
    d.status === 'downloading' || d.status === 'pending' || d.status === 'completed'
  );
  
  const filteredRecent = recentDownloads.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDoubleClick = (download: any, isActive: boolean) => {
    if (!isActive) {
      openFile(download.filePath);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, download: any, isActive: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, download, isActive });
  };

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;

    switch (action) {
      case 'open':
        openFile(contextMenu.download.filePath || contextMenu.download.outputPath);
        break;
      case 'open-folder':
        openInFolder(contextMenu.download.filePath || contextMenu.download.outputPath);
        break;
      case 'cancel':
        cancelDownload(contextMenu.download.id);
        break;
      case 'delete':
        if (confirm(`Delete "${contextMenu.download.title}"?`)) {
          deleteFile(contextMenu.download.filePath);
        }
        break;
    }

    setContextMenu(null);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const hasItems = activeDownloads.length > 0 || filteredRecent.length > 0;

  return (
    <div className="recent-downloads" onClick={closeContextMenu}>
      <div className="recent-downloads-header">
        <h2>Downloads</h2>
        <input
          type="text"
          placeholder="Search downloads..."
          value={searchQuery}
          onChange={(e) => useAppStore.getState().setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {!hasItems ? (
        <div className="empty-state">
          <p>No downloads yet</p>
        </div>
      ) : (
        <div className="downloads-list">
          {/* Active and completed downloads from current session */}
          {activeDownloads.map((download) => (
            <div
              key={download.id}
              className={`download-item ${download.status === 'completed' ? 'completed' : 'downloading'}`}
              onDoubleClick={() => download.status === 'completed' && openFile(download.outputPath)}
              onContextMenu={(e) => handleContextMenu(e, download, download.status !== 'completed')}
            >
              <div className="download-info">
                <h3 className="download-title">{download.title}</h3>
                <div className="download-meta">
                  <span className="download-quality">{download.quality}</span>
                  {download.status === 'downloading' && download.speed && download.speed !== '0 B/s' && (
                    <span className="download-speed">{download.speed}</span>
                  )}
                  {download.status === 'downloading' && download.eta && download.eta !== '--:--' && (
                    <span className="download-eta">ETA: {download.eta}</span>
                  )}
                </div>
              </div>
              {download.status === 'completed' ? (
                <div className="download-status">
                  <span className="status-icon">✓</span>
                </div>
              ) : (
                <div className="download-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${download.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{download.progress.toFixed(0)}%</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Completed downloads */}
          {filteredRecent.map((download) => (
            <div
              key={download.id}
              className="download-item completed"
              onDoubleClick={() => handleDoubleClick(download, false)}
              onContextMenu={(e) => handleContextMenu(e, download, false)}
            >
              {download.thumbnail && (
                <img
                  src={download.thumbnail}
                  alt={download.title}
                  className="download-thumbnail"
                />
              )}
              <div className="download-info">
                <h3 className="download-title">{download.title}</h3>
                <div className="download-meta">
                  <span className="download-quality">{download.quality}</span>
                  <span className="download-duration">{formatDuration(download.duration)}</span>
                  <span className="download-date">{formatDate(download.downloadedAt)}</span>
                </div>
              </div>
              <div className="download-status">
                <span className="status-icon">✓</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isActive ? (
            <button onClick={() => handleContextAction('cancel')}>
              Cancel Download
            </button>
          ) : (
            <>
              <button onClick={() => handleContextAction('open')}>
                Open Video
              </button>
              <button onClick={() => handleContextAction('open-folder')}>
                Show in Finder
              </button>
              <button onClick={() => handleContextAction('delete')} className="delete">
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
