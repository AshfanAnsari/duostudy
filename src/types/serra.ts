export type FilmQuality = 'auto' | '1080p' | '720p';

export interface MediaManifest {
  openingPoster: string;
  mobileOpeningPoster: string;
  poolPoster: string;
  interiorPoster: string;
  horizonPoster: string;
  depthAtlas: string;
  desktopVideo: string;
  mobileVideo: string;
}

export interface Chapter {
  id: string;
  number: string;
  name: string;
  eyebrow: string;
  headlineFirst: string;
  headlineSecond: string; // Cormorant Garamond italic
  supportingCopy: string;
  ctaText?: string;
  ctaAction?: 'explore' | 'continue' | 'return';
  destinationP: number;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'the-place',
    number: '01',
    name: 'The Place',
    eyebrow: 'THE ARRIVAL',
    headlineFirst: 'Somewhere beyond.',
    headlineSecond: 'Closer to yourself.',
    supportingCopy:
      'A secluded desert retreat shaped by sandstone, silence, and light. Space to slow down. Room to simply be.',
    ctaText: 'Explore Serra',
    ctaAction: 'explore',
    destinationP: 0,
  },
  {
    id: 'the-stay',
    number: '02',
    name: 'The Stay',
    eyebrow: 'INTO THE LANDSCAPE',
    headlineFirst: 'Carved by time.',
    headlineSecond: 'Made for stillness.',
    supportingCopy:
      'Follow the canyon inward to private stone suites, quiet pools, and open skies. Every detail belongs to the landscape.',
    ctaText: 'The journey continues',
    ctaAction: 'continue',
    destinationP: 0.29,
  },
  {
    id: 'experiences',
    number: '03',
    name: 'Experiences',
    eyebrow: 'BEYOND THE EXPECTED',
    headlineFirst: 'A little further.',
    headlineSecond: 'A little quieter.',
    supportingCopy:
      'Beyond the water, the sanctuary unfolds. Follow the light into private spaces, warm stone, and a quieter kind of luxury.',
    destinationP: 0.59,
  },
  {
    id: 'the-horizon',
    number: '04',
    name: 'The Horizon',
    eyebrow: 'ROOM TO BREATHE',
    headlineFirst: 'A world apart.',
    headlineSecond: 'A place within.',
    supportingCopy:
      'The canyon opens. The horizon stretches. An intimate sanctuary, and a slower way to see the world.',
    ctaText: 'Return to the beginning',
    ctaAction: 'return',
    destinationP: 1.0,
  },
];
