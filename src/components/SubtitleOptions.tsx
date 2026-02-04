import React, { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export const SubtitleOptions: React.FC = () => {
  const { availableSubtitles, selectedSubtitles, setSubtitles } = useAppStore();

  // Auto-enable subtitles and select English when subtitles become available
  useEffect(() => {
    if (availableSubtitles.length > 0 && !selectedSubtitles.enabled) {
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

  // Find English subtitle
  const englishSub = availableSubtitles.find((s) => s.lang === 'en' || s.lang.startsWith('en'));
  const otherSubs = availableSubtitles.filter((s) => s.lang !== 'en' && !s.lang.startsWith('en'));

  return (
    <div className="subtitle-options">
      <div className="subtitle-header">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={selectedSubtitles.enabled}
            onChange={handleToggle}
          />
          <span>Download Subtitles</span>
        </label>
        {selectedSubtitles.enabled && englishSub && (
          <label className="checkbox-label english-option">
            <input
              type="checkbox"
              checked={selectedSubtitles.languages.includes(englishSub.lang)}
              onChange={(e) => handleLanguageChange(englishSub.lang, e.target.checked)}
            />
            <span>English</span>
          </label>
        )}
      </div>

      {selectedSubtitles.enabled && otherSubs.length > 0 && (
        <div className="subtitle-details">
          <div className="subtitle-languages">
            {otherSubs.map((subtitle) => (
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
        </div>
      )}
    </div>
  );
};
