import React, { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export const SubtitleOptions: React.FC = () => {
  const { availableSubtitles, selectedSubtitles, setSubtitles } = useAppStore();

  // Auto-enable subtitles and select English when subtitles become available
  useEffect(() => {
    if (availableSubtitles.length > 0 && !selectedSubtitles.enabled) {
      const hasEnglish = availableSubtitles.some((s) => s.lang === 'en' || s.lang.startsWith('en'));
      const englishLang = availableSubtitles.find((s) => s.lang === 'en' || s.lang.startsWith('en'));
      
      setSubtitles({
        ...selectedSubtitles,
        enabled: true,
        languages: englishLang ? [englishLang.lang] : [],
      });
    }
  }, [availableSubtitles]);

  if (availableSubtitles.length === 0) {
    return null;
  }

  const handleToggle = () => {
    setSubtitles({
      ...selectedSubtitles,
      enabled: !selectedSubtitles.enabled,
    });
  };

  const handleLanguageChange = (lang: string, checked: boolean) => {
    const languages = checked
      ? [...selectedSubtitles.languages, lang]
      : selectedSubtitles.languages.filter((l) => l !== lang);

    setSubtitles({
      ...selectedSubtitles,
      languages,
    });
  };

  const handleFormatChange = (format: 'srt' | 'vtt' | 'ass') => {
    setSubtitles({
      ...selectedSubtitles,
      format,
    });
  };

  return (
    <div className="subtitle-options">
      <div className="subtitle-toggle">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={selectedSubtitles.enabled}
            onChange={handleToggle}
          />
          <span>Download Subtitles</span>
        </label>
      </div>

      {selectedSubtitles.enabled && (
        <div className="subtitle-details">
          <div className="subtitle-languages">
            <label>Languages:</label>
            {availableSubtitles.map((subtitle) => (
              <label key={subtitle.lang} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedSubtitles.languages.includes(subtitle.lang)}
                  onChange={(e) => handleLanguageChange(subtitle.lang, e.target.checked)}
                />
                <span>{subtitle.name}</span>
              </label>
            ))}
          </div>

          <div className="subtitle-format">
            <label htmlFor="subtitle-format">Format:</label>
            <select
              id="subtitle-format"
              value={selectedSubtitles.format}
              onChange={(e) => handleFormatChange(e.target.value as 'srt' | 'vtt' | 'ass')}
            >
              <option value="srt">SRT</option>
              <option value="vtt">VTT</option>
              <option value="ass">ASS</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
