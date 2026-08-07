// Timed lyrics are stored as JSON: [{ time: 12.4, text: "line one" }, ...]
// This keeps things simple to query and render without needing a real .lrc file format.

export function linesToTimedJson(lines, timestamps) {
  return lines.map((text, i) => ({
    time: timestamps[i] ?? 0,
    text,
  }));
}

export function parseTimedLyrics(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function getActiveLineIndex(timedLines, currentTime) {
  if (!timedLines || timedLines.length === 0) return -1;
  let activeIndex = -1;
  for (let i = 0; i < timedLines.length; i++) {
    if (timedLines[i].time <= currentTime) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
  }
