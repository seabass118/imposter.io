// ============================================================
// 100 secret words across 5 categories
// ============================================================

import { WordCategory } from '../shared/types';

export const wordsByCategory: Record<WordCategory, string[]> = {
  Objects: [
    'umbrella', 'telescope', 'candle', 'mirror', 'keyboard',
    'backpack', 'compass', 'lantern', 'scissors', 'envelope',
    'battery', 'blanket', 'helmet', 'whistle', 'notebook',
    'doorbell', 'hammock', 'pillow', 'trophy', 'paintbrush',
  ],
  Places: [
    'hospital', 'library', 'volcano', 'lighthouse', 'airport',
    'cathedral', 'submarine', 'casino', 'stadium', 'pharmacy',
    'aquarium', 'dungeon', 'balcony', 'theater', 'museum',
    'cemetery', 'jungle', 'glacier', 'island', 'rooftop',
  ],
  Animals: [
    'penguin', 'octopus', 'dolphin', 'chameleon', 'flamingo',
    'gorilla', 'jellyfish', 'peacock', 'scorpion', 'tortoise',
    'parrot', 'lobster', 'buffalo', 'hedgehog', 'panther',
    'raccoon', 'stallion', 'vulture', 'hamster', 'crocodile',
  ],
  Food: [
    'pancake', 'avocado', 'spaghetti', 'popcorn', 'chocolate',
    'pretzel', 'mushroom', 'pineapple', 'cinnamon', 'burrito',
    'dumpling', 'lasagna', 'coconut', 'baguette', 'meatball',
    'waffle', 'broccoli', 'sandwich', 'brownie', 'noodle',
  ],
  Jobs: [
    'astronaut', 'detective', 'surgeon', 'architect', 'mechanic',
    'bartender', 'lifeguard', 'magician', 'gardener', 'professor',
    'plumber', 'journalist', 'composer', 'firefighter', 'diplomat',
    'shepherd', 'carpenter', 'chemist', 'sculptor', 'librarian',
  ],
};

/** Returns a random word from the enabled categories, falling back to all categories if empty */
export function getRandomWordFromCategories(enabled: WordCategory[]): string {
  const cats = enabled.length > 0 ? enabled : (Object.keys(wordsByCategory) as WordCategory[]);
  const pool: string[] = cats.flatMap(cat => wordsByCategory[cat]);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Returns a random word from all categories (backwards-compatible wrapper) */
export function getRandomWord(): string {
  return getRandomWordFromCategories([]);
}

export default Object.values(wordsByCategory).flat();
