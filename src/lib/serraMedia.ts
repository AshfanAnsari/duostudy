import type { MediaManifest } from '../types/serra';

// Rehosted local assets in public/media/ as requested in Section 2
export const SERRA_MEDIA: MediaManifest = {
  openingPoster: '/media/opening.webp',
  mobileOpeningPoster: '/media/opening-mobile.webp',
  poolPoster: '/media/pool-hd.webp',
  interiorPoster: '/media/interior-hd.webp',
  horizonPoster: '/media/horizon-hd.webp',
  depthAtlas: '/media/depth-atlas-hd.webp',
  desktopVideo: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/journey-1080-web_00127e13.mp4',
  mobileVideo: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/journey-720-web_5332f149.mp4',
};

// Remote fallbacks in case of external hosting
export const REMOTE_MEDIA: MediaManifest = {
  openingPoster: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/opening_a7ec2fa6.webp',
  mobileOpeningPoster: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/opening-mobile_1476bba9.webp',
  poolPoster: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/pool-hd_3044321f.webp',
  interiorPoster: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/interior-hd_ce1e0ce4.webp',
  horizonPoster: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/horizon-hd_ed4ce70a.webp',
  depthAtlas: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/depth-atlas-hd_cf621fd5.webp',
  desktopVideo: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/journey-1080-web_00127e13.mp4',
  mobileVideo: 'https://serrasanctua-carvxfs7.manus.space/manus-storage/journey-720-web_5332f149.mp4',
};
