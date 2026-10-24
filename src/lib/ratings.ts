/** The 1–5 mood scale shown on the lap sheet and in Review. */
export const MOODS = [
  { value: 1, emoji: '😠', label: 'Angry' },
  { value: 2, emoji: '😣', label: 'Frustrated' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Happy' },
  { value: 5, emoji: '🤩', label: 'Excited' },
] as const;

/** Nearest mood for an average rating, e.g. 3.6 → Happy. */
export function moodFor(value: number) {
  return MOODS[Math.min(4, Math.max(0, Math.round(value) - 1))];
}
