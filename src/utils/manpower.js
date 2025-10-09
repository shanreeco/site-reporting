export const SHIFT_OPTIONS = ["AM", "PM", "Evening"];
export const LEVEL_OPTIONS = ["Basement", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"];
export const ZONE_LETTERS = ["A", "B", "C", "D", "E"];
export const ZONE_NUMBERS = ["1", "2"];

export function formatManpowerZone(level, zoneLetter, zoneNumber) {
  const parts = [];
  const trimmedLevel = (level || "").trim();
  const trimmedZoneLetter = (zoneLetter || "").trim();
  const trimmedZoneNumber = (zoneNumber || "").trim();

  if (trimmedLevel) parts.push(`Level ${trimmedLevel}`);
  if (trimmedZoneLetter) {
    const zoneSuffix = trimmedZoneNumber ? `${trimmedZoneLetter}-${trimmedZoneNumber}` : trimmedZoneLetter;
    parts.push(`Zone ${zoneSuffix}`);
  }

  return parts.join(" | ");
}

export function parseManpowerZone(value) {
  if (!value) {
    return { level: "", zoneLetter: "", zoneNumber: "" };
  }

  const levelMatch = value.match(/Level\s+([^|]+)/i);
  const zoneMatch = value.match(/Zone\s+([A-Z])(?:-([0-9]+))?/i);

  const level = levelMatch ? levelMatch[1].trim() : "";
  const zoneLetter = zoneMatch ? zoneMatch[1].toUpperCase() : "";
  const zoneNumber = zoneMatch && zoneMatch[2] ? zoneMatch[2].trim() : "";

  return { level, zoneLetter, zoneNumber };
}

export function splitManpowerNotes(notes) {
  if (!notes) {
    return { notesText: "", photoUrl: "" };
  }

  const photoRegex = /Photo:\s*(\S+)/i;
  const match = notes.match(photoRegex);
  const photoUrl = match ? match[1].trim() : "";
  let notesText = notes;

  if (match) {
    notesText = notes.replace(match[0], "");
  }

  notesText = notesText.replace(/\n{2,}/g, "\n").trim();

  return { notesText, photoUrl };
}

export function buildManpowerNotes(notesText, photoUrl) {
  const trimmedNotes = (notesText || "").trim();
  const trimmedPhoto = (photoUrl || "").trim();
  const segments = [];

  if (trimmedNotes) segments.push(trimmedNotes);
  if (trimmedPhoto) segments.push(`Photo: ${trimmedPhoto}`);

  return segments.join("\n\n");
}
