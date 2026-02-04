import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../stores/app-store';
import { getFormatOptions } from '../utils/formatting';

export const QualitySelector: React.FC = () => {
  const { availableFormats, selectedQuality, setQuality } = useAppStore();

  const formatOptions = useMemo(() => getFormatOptions(availableFormats), [availableFormats]);

  // Auto-select the first quality option when formats become available
  useEffect(() => {
    if (formatOptions.length > 0 && !selectedQuality) {
      setQuality(formatOptions[0]);
    }
  }, [formatOptions]);

  if (formatOptions.length === 0) {
    return null;
  }

  return (
    <div className="quality-selector">
      <label htmlFor="quality-select">Video Quality</label>
      <select
        id="quality-select"
        value={selectedQuality?.id || ''}
        onChange={(e) => {
          const selected = formatOptions.find((f) => f.id === e.target.value);
          if (selected) {
            setQuality(selected);
          }
        }}
        className="quality-select"
      >
        {formatOptions.map((format) => (
          <option key={format.id} value={format.id}>
            {format.label}
          </option>
        ))}
      </select>
    </div>
  );
};
