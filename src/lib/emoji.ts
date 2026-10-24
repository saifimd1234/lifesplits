const DEFAULTS: Record<string, string> = {
  'getting ready': '🪥',
  breakfast: '🍳',
  work: '💼',
  commute: '🚌',
  lunch: '🥗',
  chores: '🧹',
  dinner: '🍽️',
  scrolling: '📱',
  tv: '📺',
  break: '☕',
  workout: '🏋️',
  gym: '🏋️',
  run: '🏃',
  'meal prep': '🥘',
  spanish: '🗣️',
  reading: '📚',
  study: '📖',
  guitar: '🎸',
  meditation: '🧘',
  shower: '🚿',
  groceries: '🛒',
  nap: '😴',
  gaming: '🎮',
  family: '👨‍👩‍👧',
};

/** A sensible icon for well-known activity names, empty otherwise. */
export const defaultEmojiFor = (name: string) => DEFAULTS[name.trim().toLowerCase()] ?? '';

export const EMOJI_CHOICES = [
  '💼', '💻', '📚', '📖', '✍️', '🧠', '🗣️', '🎸',
  '🎨', '📷', '🏋️', '🏃', '🧘', '🚴', '⚽', '🏊',
  '🍳', '🥗', '🍽️', '🥘', '☕', '🪥', '🚿', '🧹',
  '🛒', '🧺', '🚌', '🚗', '🚶', '✈️', '📱', '📺',
  '🎮', '🎧', '💬', '📞', '👨‍👩‍👧', '❤️', '🐶', '🌳',
  '🙏', '💊', '😴', '🛏️', '💰', '🧾', '🛠️', '⭐',
];

export const categoryLabel = (c: { name: string; emoji?: string }) => (c.emoji ? `${c.emoji} ${c.name}` : c.name);
