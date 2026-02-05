import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { formatDuration, formatDate } from '../utils/validation';

export const RecentDownloads: React.FC = () => {
  const downloadQueue = useAppStore((state) => state.downloadQueue);
  const recentDownloads = useAppStore((state) => state.recentDownloads);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const openFile = useAppStore((state) => state.openFile);
  const openFileWith = useAppStore((state) => state.openFileWith);
  const getAppsForFile = useAppStore((state) => state.getAppsForFile);
  const openInFolder = useAppStore((state) => state.openInFolder);
  const deleteFile = useAppStore((state) => state.deleteFile);
  const loadRecentDownloads = useAppStore((state) => state.loadRecentDownloads);
  const cancelDownload = useAppStore((state) => state.cancelDownload);
  const removeFromQueue = useAppStore((state) => state.removeFromQueue);
  const clearRecentDownloads = useAppStore((state) => state.clearRecentDownloads);
  const removeRecentDownload = useAppStore((state) => state.removeRecentDownload);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; download: any; isActive: boolean; isFromQueue: boolean } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'remove-all'; title: string; filePath?: string } | null>(null);
  const [openWithApps, setOpenWithApps] = useState<Array<[string, string, string]>>([]);
  const [showOpenWith, setShowOpenWith] = useState(false);
  const [appsCache, setAppsCache] = useState<Array<[string, string, string]> | null>(null);

  useEffect(() => {
    loadRecentDownloads();
  }, []);

  // Debug: log when downloadQueue changes
  useEffect(() => {
    console.log('downloadQueue updated:', downloadQueue);
  }, [downloadQueue]);

  // Combine active downloads and recent downloads
  const activeDownloads = downloadQueue.filter(d => 
    d.status === 'downloading' || d.status === 'pending' || d.status === 'completed'
  );
  
  // Filter out recent downloads that are already in the active queue (to avoid duplicates)
  const activeIds = new Set(activeDownloads.map(d => d.id));
  const filteredRecent = recentDownloads.filter((d) =>
    !activeIds.has(d.id) &&
    (d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDoubleClick = (download: any, isActive: boolean) => {
    if (!isActive) {
      openFile(download.filePath);
    }
  };

  const handleContextMenu = async (e: React.MouseEvent, download: any, isActive: boolean, isFromQueue: boolean = false) => {
    e.preventDefault();
    setShowOpenWith(false);
    setContextMenu({ x: e.clientX, y: e.clientY, download, isActive, isFromQueue });
    
    // Use cached apps if available, otherwise fetch
    const filePath = download.filePath || download.outputPath;
    if (filePath && !isActive) {
      if (appsCache) {
        setOpenWithApps(appsCache);
      } else {
        // Fetch apps in background
        getAppsForFile(filePath).then(apps => {
          setAppsCache(apps);
          setOpenWithApps(apps);
        });
      }
    }
  };

  const handleContextAction = async (action: string) => {
    if (!contextMenu) return;
    
    const download = contextMenu.download;
    const isFromQueue = contextMenu.isFromQueue;
    const filePath = download.filePath || download.outputPath;
    
    // Close context menu first
    setContextMenu(null);

    switch (action) {
      case 'open':
        openFile(filePath);
        break;
      case 'open-with':
        // Show app chooser dialog as fallback
        openFileWith(filePath);
        break;
      case 'open-folder':
        openInFolder(filePath);
        break;
      case 'cancel':
        cancelDownload(download.id);
        break;
      case 'delete':
        setConfirmDialog({ type: 'delete', title: download.title, filePath });
        break;
      case 'remove':
        if (isFromQueue) {
          removeFromQueue(download.id);
        } else {
          removeRecentDownload(download.id);
        }
        break;
      case 'remove-all':
        setConfirmDialog({ type: 'remove-all', title: '' });
        break;
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    
    if (confirmDialog.type === 'delete' && confirmDialog.filePath) {
      await deleteFile(confirmDialog.filePath);
    } else if (confirmDialog.type === 'remove-all') {
      downloadQueue.forEach(d => {
        if (d.status === 'completed') {
          removeFromQueue(d.id);
        }
      });
      clearRecentDownloads();
    }
    setConfirmDialog(null);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowOpenWith(false);
  };

  const handleOpenWithApp = (appPath: string) => {
    if (!contextMenu) return;
    const filePath = contextMenu.download.filePath || contextMenu.download.outputPath;
    openFileWith(filePath, appPath);
    closeContextMenu();
  };

  const hasItems = activeDownloads.length > 0 || filteredRecent.length > 0;

  console.log('Rendering RecentDownloads, activeDownloads:', activeDownloads.length, 'filteredRecent:', filteredRecent.length);

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
              onContextMenu={(e) => handleContextMenu(e, download, download.status === 'downloading', true)}
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
          
          {/* Completed downloads from storage */}
          {filteredRecent.map((download) => (
            <div
              key={download.id}
              className="download-item completed"
              onDoubleClick={() => handleDoubleClick(download, false)}
              onContextMenu={(e) => handleContextMenu(e, download, false, false)}
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
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isActive ? (
            <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('cancel'); }}>
              Cancel Download
            </button>
          ) : (
            <>
              <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('open'); }}>
                Open Video
              </button>
              <div 
                className="context-menu-item-with-submenu"
                onMouseEnter={() => setShowOpenWith(true)}
                onMouseLeave={() => setShowOpenWith(false)}
              >
                <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('open-with'); }}>
                  Open With
                  <span className="submenu-arrow">▶</span>
                </button>
                {showOpenWith && openWithApps.length > 0 && (
                  <div className="submenu">
                    {openWithApps.map(([name, path, icon], index) => (
                      <button 
                        key={path} 
                        onMouseDown={(e) => { e.stopPropagation(); handleOpenWithApp(path); }}
                        className={index === 0 ? 'default-app' : ''}
                      >
                        {icon && <img src={`data:image/png;base64,${icon}`} alt="" className="app-icon" />}
                        {!icon && <span className="app-icon-placeholder" />}
                        <span className="app-name">{name}</span>
                        {index === 0 && <span className="default-label">(default)</span>}
                      </button>
                    ))}
                    <div className="context-menu-divider" />
                    <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('open-with'); }}>
                      <span className="app-icon-placeholder" />
                      <span className="app-name">Other...</span>
                    </button>
                  </div>
                )}
              </div>
              <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('open-folder'); }}>
                Show in Finder
              </button>
              <div className="context-menu-divider" />
              <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('remove'); }}>
                Remove from List
              </button>
              <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('remove-all'); }}>
                Remove All from List
              </button>
              <div className="context-menu-divider" />
              <button onMouseDown={(e) => { e.stopPropagation(); handleContextAction('delete'); }} className="delete">
                Delete File
              </button>
            </>
          )}
        </div>
      )}

      {confirmDialog && (
        <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmDialog.type === 'delete' ? 'Delete File?' : 'Remove All?'}</h3>
            <p>
              {confirmDialog.type === 'delete' 
                ? `This will permanently delete "${confirmDialog.title}" from disk.`
                : 'This will remove all items from the list. Files will not be deleted from disk.'}
            </p>
            <div className="confirm-buttons">
              <button className="cancel-btn" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="confirm-btn" onClick={handleConfirmAction}>
                {confirmDialog.type === 'delete' ? 'Delete' : 'Remove All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
