import { FontKey } from '@/theme/font';

export type FeedMusicPreview = {
  provider: 'appleMusic';
  songId: string;
  title: string;
  artistName: string;
  artworkUrl?: string;
  previewUrl?: string;
  startAtMs: number;
  durationMs: number;
  mutedByDefault: true;
};

export const ALIGN_LIST = ['left', 'center', 'right'] as const;
export type TEXT_ALIGN_MODE = (typeof ALIGN_LIST)[number];

interface LayerDraft {
  id: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface TextLayerDraft extends LayerDraft {
  text: string;
  color: string;
  fontKey: FontKey;
  fontSize: number;
  align: TEXT_ALIGN_MODE;
  width: number;
}

export interface StickerLayerDraft extends LayerDraft {
  uri: string;
  width: number;
  height: number;
}

export type FilterState = 'none' | 'warm' | 'cool';
