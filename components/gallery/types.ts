export type SelectedAsset = {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
  albumId?: string;
};

export type EditorDraft = {
  assets: SelectedAsset[];
  activeIndex: number;
  audio?: {
    source: 'youtube';
    videoId: string;
    title: string;
    thumbnail: string;
  };
  colorFilter?: string;
  overlays: Array<unknown>;
  location?: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
  };
};

export type MediaBucketKey = 'recent' | 'videos' | 'favorites' | 'albums';

/**
 * FlatList 의 Image 태그를 이루는 핵심 타입입니다.
 *
 * photo, video 타입으로 구분됩니다.
 * */
export type PickerAsset = {
  id: string;
  uri: string;
  thumbnailUri?: string | null;
  mediaType: 'photo' | 'video';
  width: number;
  height: number;
  duration?: number;
};

export type PickerAlbum = {
  id: string;
  title: string;
  count: number;
};

export type AlbumMenuItem = {
  key: MediaBucketKey;
  label: string;
};
