export const sanitizeFilename = (filename: string): string => {
  // Remove invalid characters from filename
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const generateOutputPath = (title: string, format: string, saveLocation: string): string => {
  const sanitizedTitle = sanitizeFilename(title);
  return `${saveLocation}/${sanitizedTitle}.${format}`;
};

export const getBestQuality = (formats: any[]): any => {
  if (formats.length === 0) return null;

  // Sort by resolution (descending) and prefer mp4
  const sorted = [...formats].sort((a, b) => {
    const aRes = parseInt(a.resolution) || 0;
    const bRes = parseInt(b.resolution) || 0;
    if (aRes !== bRes) return bRes - aRes;
    if (a.ext === 'mp4' && b.ext !== 'mp4') return -1;
    if (b.ext === 'mp4' && a.ext !== 'mp4') return 1;
    return 0;
  });

  return sorted[0];
};

export const getQualityLabel = (format: any): string => {
  if (format.resolution) {
    return `${format.resolution} (${format.ext.toUpperCase()})`;
  }
  return format.ext.toUpperCase();
};

// Helper to extract vertical resolution (height) from resolution string like "1920x1080" or "1080p"
const getResolutionHeight = (resolution: string): number => {
  if (!resolution) return 0;
  // Handle "1920x1080" format - extract height (second number)
  const match = resolution.match(/(\d+)x(\d+)/);
  if (match) {
    return parseInt(match[2], 10);
  }
  // Handle "1080p" format
  const pMatch = resolution.match(/(\d+)p/);
  if (pMatch) {
    return parseInt(pMatch[1], 10);
  }
  // Fallback: try to parse as number
  return parseInt(resolution, 10) || 0;
};

export const getFormatOptions = (formats: any[]): any[] => {
  const uniqueFormats = new Map<string, any>();

  for (const format of formats) {
    const key = `${format.resolution}-${format.ext}`;
    if (!uniqueFormats.has(key)) {
      uniqueFormats.set(key, format);
    }
  }

  const options = Array.from(uniqueFormats.values()).map((format) => ({
    id: format.id,
    label: getQualityLabel(format),
    resolution: format.resolution,
    format: format.ext,
  }));

  // Sort by resolution height (descending) and prefer mp4
  return options.sort((a, b) => {
    const aRes = getResolutionHeight(a.resolution);
    const bRes = getResolutionHeight(b.resolution);
    if (aRes !== bRes) return bRes - aRes;
    if (a.format === 'mp4' && b.format !== 'mp4') return -1;
    if (b.format === 'mp4' && a.format !== 'mp4') return 1;
    return 0;
  });
};
