import React, { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { invoke } from '@tauri-apps/api/core';

export const SaveLocationPicker: React.FC = () => {
  const { saveLocation, setSaveLocation } = useAppStore();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectLocation = async () => {
    setIsSelecting(true);
    try {
      const path = await invoke<string>('select_save_location');
      setSaveLocation(path);
      // Save the location for next app launch
      await invoke('save_last_location', { location: path });
    } catch (error) {
      console.error('Failed to select save location:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="save-location-picker">
      <label htmlFor="save-location">Save Location</label>
      <div className="location-input-group">
        <input
          type="text"
          id="save-location"
          value={saveLocation}
          onChange={(e) => setSaveLocation(e.target.value)}
          placeholder="Select download location..."
          className="location-input"
          readOnly
        />
        <button
          onClick={handleSelectLocation}
          disabled={isSelecting}
          className="browse-button"
        >
          {isSelecting ? 'Selecting...' : 'Browse'}
        </button>
      </div>
    </div>
  );
};
