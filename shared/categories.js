export const CATEGORY_NAMES = [
  'Books',
  'Electronics',
  'Fashion',
  'Home',
  'Gaming',
  'Music',
  'Sports',
  'Others',
];

export const CATEGORY_ICONS = {
  Books: '📚',
  Electronics: '💻',
  Fashion: '👕',
  Home: '🏠',
  Gaming: '🎮',
  Music: '🎵',
  Sports: '⚽',
  Others: '📦',
};

export const CATEGORY_ICON_COMPONENTS = {
  Books: 'Book',
  Electronics: 'Cpu',
  Fashion: 'Shirt',
  Home: 'Home',
  Gaming: 'Gamepad2',
  Music: 'Music',
  Sports: 'Dumbbell',
  Others: 'Package',
};

export const CATEGORY_NORMALIZATION_MAP = {
  'Fashion & Accessories': 'Fashion',
  'Home & Living': 'Home',
  'Musical Instruments': 'Music',
  'Sports & Fitness': 'Sports',
};

export const normalizeCategory = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (CATEGORY_NAMES.includes(trimmed)) return trimmed;
  return CATEGORY_NORMALIZATION_MAP[trimmed] || trimmed;
};
