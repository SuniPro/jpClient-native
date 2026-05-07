import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import JpMediaThumbnails, { ThumbnailQuality } from '@/modules/jp-media-thumbnails';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../Text';
import { AlbumMenuItem, MediaBucketKey, PickerAlbum, PickerAsset } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const CELL_SIZE = Math.floor(SCREEN_WIDTH / NUM_COLUMNS);

const INITIAL_LOAD_COUNT = 80;
const PAGINATION_LOAD_COUNT = 80;

const FULL_FAST_BATCH_SIZE = 128;
const FULL_HIGH_BATCH_SIZE = 80;

const ALBUM_MENU: AlbumMenuItem[] = [
  { key: 'recent', label: '최근 항목' },
  { key: 'videos', label: '동영상' },
  { key: 'favorites', label: '즐겨찾기' },
  { key: 'albums', label: '모든 사진첩' },
];

function toPickerAsset(asset: MediaLibrary.Asset): PickerAsset {
  return {
    id: asset.id,
    uri: asset.uri,
    thumbnailUri: null,
    mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

/**
 * 유저가 실제로 보는 갤러리 화면을 그리는 컴포넌트입니다.
 * SOT 상 한 장의 asset 을 화면에 어떻게 보여줄지에 대한 책임을 가집니다.
 *
 * @item : 실제 Asset Data (PickerAsset 타입)
 * @assetsId : 선택된 item 을 관리하기 위한 id props
 * @isSelected : 선택 여부
 * @selectedIndex : 다중 선택 시 몇번째 index 인지 구분하기 위한 props
 * @multiSelectEnabled : 다중 선택 모드인지 여부
 * @onPressAsset : 셀 탭 시 호출되는 함수 (현재는 toggleAsset)
 * */
const AssetCell = React.memo(function AssetCell({
  item,
  assetId,
  isSelected,
  selectedIndex,
  multiSelectEnabled,
  onPressAsset,
}: {
  item: PickerAsset;
  assetId: string;
  isSelected: boolean;
  selectedIndex: number;
  multiSelectEnabled: boolean;
  onPressAsset: (assetId: string) => void;
}) {
  return (
    // Pressable 을 클릭할때 onPressAsset 으로 받은 toggleAsset 을 실행합니다.
    <Pressable style={styles.cell} onPress={() => onPressAsset(assetId)}>
      {/* 썸네일 여부를 확인해서 현재 아이템의 view 를 결정합니다. */}
      {item.thumbnailUri ? (
        <Image
          source={{ uri: item.thumbnailUri }}
          style={styles.cellImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : (
        <View style={styles.cellPlaceholder} />
      )}

      {/* video 일 경우 뱃지를 표시합니다. */}
      {item.mediaType === 'video' ? (
        <View style={styles.videoBadge}>
          <AppText style={styles.videoBadgeText}>VIDEO</AppText>
        </View>
      ) : null}

      {/* isSelected == ture 일때, 다중 선택이라면 prev + 1을, 아닐 경우 체크를 표시합니다. */}
      {isSelected ? (
        <View style={styles.selectionBadge}>
          <AppText style={styles.selectionBadgeText}>
            {multiSelectEnabled ? selectedIndex + 1 : '✓'}
          </AppText>
        </View>
      ) : (
        <View style={styles.selectionBadgeEmpty} />
      )}
    </Pressable>
  );
});

/** 앨범을 선택하여, 해당 앨범의 사진들을 화면에 뿌려주는 컴포넌트입니다.
 *
 * 1. 앨범의 사진들을 render 합니다.
 * 2. 선택된 사진들의 preview 를 header 아래에 render 합니다.
 * 3. 선택은 multiSelectEnabled 에 따라 selectedIds 에 단일 개체를 저장할지 복수 객체를 저장할지 결정합니다.
 *
 * */
export default function PostMediaPickerScreen() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const [albums, setAlbums] = useState<PickerAlbum[]>([]);
  const [assets, setAssets] = useState<PickerAsset[]>([]);

  const [activeBucket, setActiveBucket] = useState<MediaBucketKey>('recent');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeAlbumTitle, setActiveAlbumTitle] = useState('최근 항목');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [albumsSheetOpen, setAlbumsSheetOpen] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  /**
   * fast / high 품질을 분리해서 관리.
   * - fast: 빨리 뜨게 하는 1차 썸네일
   * - high: 나중에 덮어쓸 2차 고화질 썸네일
   */

  // 이미 받아온 썸네일의 uri 를 기억해서 중복 요청을 방지합니다.
  const fastThumbnailMapRef = useRef<Map<string, string>>(new Map());
  const highThumbnailMapRef = useRef<Map<string, string>>(new Map());

  // 현재 요청 중인 썸네일의 assetId를 기억해서 중복 요청을 방지합니다.
  const fastThumbnailLoadingRef = useRef<Set<string>>(new Set());
  const highThumbnailLoadingRef = useRef<Set<string>>(new Set());

  // 현재까지 로드된 이미지들의 위치를 기억하는 ref 입니다.
  // ui 변경이 필요없기에 state -> ref로 변경합니다.
  const endCursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const fullFastIndexRef = useRef(0);
  const fullHighIndexRef = useRef(0);

  const fullFastRunningRef = useRef(false);
  const fullHighRunningRef = useRef(false);

  const fullFastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullHighTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoPagingRunningRef = useRef(false);
  const autoPagingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 렌더링 초기에 사용되는 함수들입니다.
   * */

  // 권한 요청
  const requestPermission = useCallback(async () => {
    try {
      const current = await MediaLibrary.getPermissionsAsync();

      if (current.granted || current.accessPrivileges === 'limited') {
        setPermissionGranted(true);
        return true;
      }

      const next = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      const granted = next.granted || next.accessPrivileges === 'limited';

      setPermissionGranted(granted);
      return granted;
    } catch (error) {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const loadAlbums = useCallback(async () => {
    try {
      const permission = await MediaLibrary.getPermissionsAsync();

      if (!permission.granted && permission.accessPrivileges !== 'limited') {
        return;
      }

      const result = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      const mapped: PickerAlbum[] = result.map((album) => ({
        id: album.id,
        title: album.title,
        count: album.assetCount ?? 0,
      }));

      setAlbums(mapped);
    } catch (error) {
      // noop
    }
  }, []);

  /**
   * load Asset
   * */

  /**
   * 썸네일 URI를 assets 상태에 반영.
   * high 품질이 나중에 오면 fast를 자연스럽게 덮어쓴다.
   */
  const patchThumbnailUris = useCallback((entries: Array<{ id: string; uri: string | null }>) => {
    if (entries.length === 0) return;

    const patchMap = new Map(
      entries
        // 현재 asset 배열에서 uri가 있는 것만 남기고, null 인 것은 버립니다.
        // 타입가드로 filter 가 통과된 Entry 에 대해 string 으로 취급하게 만들어줍니다.
        .filter((entry): entry is { id: string; uri: string } => Boolean(entry.uri))
        .map((entry) => [entry.id, entry.uri]),
    );

    if (patchMap.size === 0) return;

    // 상황을 두가지로 가정해서 최적화하는 코드입니다.
    // !nextThumb 썸네일이 없거나, 썸네일이 현재 썸네일과 uri가 동일할 경우 기존의 item을 그대로 사용하고,
    // 두가지가 아닐경우 그때 changed 의 상태를 변경해서 변경 객체를 전달해서 렌더링 시켜 불필요한 렌더링을 방지합니다.
    setAssets((prev) => {
      let changed = false;

      const next = prev.map((item) => {
        const nextThumb = patchMap.get(item.id);
        if (!nextThumb || nextThumb === item.thumbnailUri) return item;
        changed = true;
        return { ...item, thumbnailUri: nextThumb };
      });

      return changed ? next : prev;
    });
  }, []);

  /**
   * 품질별 batch 요청 함수.
   * - fast / high를 따로 요청
   * - 이미 받은 품질은 다시 요청하지 않음
   */
  const ensureThumbnailsByQuality = useCallback(
    async (assetIds: string[], quality: ThumbnailQuality) => {
      const mapRef = quality === 'high' ? highThumbnailMapRef : fastThumbnailMapRef;
      const loadingSetRef = quality === 'high' ? highThumbnailLoadingRef : fastThumbnailLoadingRef;

      const targetIds = Array.from(new Set(assetIds)).filter((id) => {
        if (mapRef.current.has(id)) return false;
        return !loadingSetRef.current.has(id);
      });

      console.log(`[ensureThumbnailsByQuality:${quality}] assetIds=`, assetIds);
      console.log(`[ensureThumbnailsByQuality:${quality}] targetIds=`, targetIds);

      if (targetIds.length === 0) return;

      targetIds.forEach((id) => loadingSetRef.current.add(id));

      try {
        const result = await JpMediaThumbnails.getThumbnailBatch(targetIds, {
          width: CELL_SIZE,
          height: CELL_SIZE,
          quality,
        });

        console.log(`[ensureThumbnailsByQuality:${quality}] result keys=`, Object.keys(result));

        const entries = targetIds.map((id) => {
          const uri = result[id] ?? null;

          if (uri) {
            mapRef.current.set(id, uri);
          }

          return { id, uri };
        });

        patchThumbnailUris(entries);
      } catch (error) {
        console.log(`[thumb][batch:${quality}] failed`, error);
      } finally {
        targetIds.forEach((id) => loadingSetRef.current.delete(id));
      }
    },
    [patchThumbnailUris],
  );

  /** 어떤 사진들이 있는지 가져오는 함수입니다.
   *
   * 1. reset props 에 따라 새로 가져올지, endCursorRef 에 저장된 마지막 위치 이후의 사진들을 가져올지 결정합니다.
   * 2. 현재 first 로 저장된 상수인 INITIAL_LOAD_COUNT 를 props로 받아 따라서 최초 몇 장을 가져올 지 결정할 수 있습니다.
   * 3. MediaBucketKey 타입으로 정의된 bucket 에 따라 현재 앨범을 확인합니다.
   * */
  const loadAssets = useCallback(
    async ({
      reset,
      albumId,
      bucket,
      first,
    }: {
      reset: boolean;
      albumId: string | null;
      bucket: MediaBucketKey;
      first: number;
    }) => {
      // 권한을 체크해서 전체 사진을 가져올 수 있는 지 없는 지 판단합니다.
      const permission = await MediaLibrary.getPermissionsAsync();
      const granted = permission.granted || permission.accessPrivileges === 'limited';

      if (!granted) return null;
      if (loadingRef.current) return null;

      loadingRef.current = true;
      setLoading(true);

      try {
        const result = await MediaLibrary.getAssetsAsync({
          first,
          after: reset ? undefined : (endCursorRef.current ?? undefined),
          album: bucket === 'albums' ? (albumId ?? undefined) : undefined,
          mediaType: bucket === 'videos' ? ['video'] : ['photo', 'video'],
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });

        const mapped = result.assets.map(toPickerAsset);

        setAssets((prev) => {
          if (reset) return mapped;

          const existingIds = new Set(prev.map((item) => item.id));
          const deduped = mapped.filter((item) => !existingIds.has(item.id));
          return [...prev, ...deduped];
        });

        endCursorRef.current = result.endCursor ?? null;
        setHasNextPage(result.hasNextPage);

        return result;
      } catch (error) {
        return null;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  const scheduleAutoPagination = useCallback(() => {
    if (autoPagingTimerRef.current) {
      clearTimeout(autoPagingTimerRef.current);
    }

    autoPagingTimerRef.current = setTimeout(async () => {
      if (autoPagingRunningRef.current) return;
      if (!hasNextPage) return;
      if (loadingRef.current || loadingMoreRef.current) return;

      autoPagingRunningRef.current = true;
      loadingMoreRef.current = true;

      try {
        const result = await loadAssets({
          reset: false,
          albumId: activeAlbumId,
          bucket: activeBucket,
          first: PAGINATION_LOAD_COUNT,
        });

        if (result?.hasNextPage) {
          scheduleAutoPagination();
        }
      } finally {
        autoPagingRunningRef.current = false;
        loadingMoreRef.current = false;
      }
    }, 120);
  }, [activeAlbumId, activeBucket, hasNextPage, loadAssets]);

  /** 앨범 혹은 기타 사유에 의해 reset 될 경우 진행해야하는 reset 로직 모음입니다. */
  const resetPickerSession = () => {
    endCursorRef.current = null;

    fullFastIndexRef.current = 0;
    fullHighIndexRef.current = 0;

    if (fullFastTimerRef.current) {
      clearTimeout(fullFastTimerRef.current);
      fullFastTimerRef.current = null;
    }

    if (fullHighTimerRef.current) {
      clearTimeout(fullHighTimerRef.current);
      fullHighTimerRef.current = null;
    }

    fullFastRunningRef.current = false;
    fullHighRunningRef.current = false;

    fastThumbnailMapRef.current.clear();
    highThumbnailMapRef.current.clear();

    fastThumbnailLoadingRef.current.clear();
    highThumbnailLoadingRef.current.clear();

    if (autoPagingTimerRef.current) {
      clearTimeout(autoPagingTimerRef.current);
      autoPagingTimerRef.current = null;
    }
    autoPagingRunningRef.current = false;

    setAssets([]);
    setSelectedIds([]);
    setHasNextPage(true);
  };

  const hasPendingFastThumbnails = useCallback(() => {
    return assets.some((asset) => {
      if (!asset) return false;
      if (fastThumbnailMapRef.current.has(asset.id)) return false;
      return !fastThumbnailLoadingRef.current.has(asset.id);
    });
  }, [assets]);

  const hasPendingHighThumbnails = useCallback(() => {
    return assets.some((asset) => {
      if (!asset) return false;
      if (!fastThumbnailMapRef.current.has(asset.id)) return false;
      if (highThumbnailMapRef.current.has(asset.id)) return false;
      return !highThumbnailLoadingRef.current.has(asset.id);
    });
  }, [assets]);

  const scheduleFullFastPreload = useCallback(() => {
    if (fullFastTimerRef.current) {
      clearTimeout(fullFastTimerRef.current);
    }

    fullFastTimerRef.current = setTimeout(async () => {
      if (fullFastRunningRef.current) return;
      if (assets.length === 0) return;

      fullFastRunningRef.current = true;

      try {
        const candidates: string[] = [];
        let index = fullFastIndexRef.current;

        while (index < assets.length && candidates.length < FULL_FAST_BATCH_SIZE) {
          const asset = assets[index];
          index += 1;

          if (!asset) continue;
          if (fastThumbnailMapRef.current.has(asset.id)) continue;
          if (fastThumbnailLoadingRef.current.has(asset.id)) continue;

          candidates.push(asset.id);
        }

        fullFastIndexRef.current = index;

        if (candidates.length > 0) {
          console.log('[full fast] candidates=', candidates.length);
          await ensureThumbnailsByQuality(candidates, 'fast');
        }

        // 끝까지 갔으면 처음으로 돌아가서 혹시 남은 누락분 재확인
        if (fullFastIndexRef.current >= assets.length) {
          fullFastIndexRef.current = 0;
        }

        // reset 전까지, 아직 남은 fast가 있으면 계속 진행
        if (hasPendingFastThumbnails()) {
          scheduleFullFastPreload();
        }
      } finally {
        fullFastRunningRef.current = false;
      }
    }, 80);
  }, [assets, ensureThumbnailsByQuality, hasPendingFastThumbnails]);

  const scheduleFullHighPreload = useCallback(() => {
    if (fullHighTimerRef.current) {
      clearTimeout(fullHighTimerRef.current);
    }

    fullHighTimerRef.current = setTimeout(async () => {
      if (fullHighRunningRef.current) return;
      if (assets.length === 0) return;

      fullHighRunningRef.current = true;

      try {
        const candidates: string[] = [];
        let index = fullHighIndexRef.current;

        while (index < assets.length && candidates.length < FULL_HIGH_BATCH_SIZE) {
          const asset = assets[index];
          index += 1;

          if (!asset) continue;

          // fast가 없는 건 아직 high 승격 대상 아님
          if (!fastThumbnailMapRef.current.has(asset.id)) continue;

          if (highThumbnailMapRef.current.has(asset.id)) continue;
          if (highThumbnailLoadingRef.current.has(asset.id)) continue;

          candidates.push(asset.id);
        }

        fullHighIndexRef.current = index;

        if (candidates.length > 0) {
          console.log('[full high] candidates=', candidates.length);
          await ensureThumbnailsByQuality(candidates, 'high');
        }

        if (fullHighIndexRef.current >= assets.length) {
          fullHighIndexRef.current = 0;
        }

        if (hasPendingHighThumbnails()) {
          scheduleFullHighPreload();
        }
      } finally {
        fullHighRunningRef.current = false;
      }
    }, 180);
  }, [assets, ensureThumbnailsByQuality, hasPendingHighThumbnails]);

  /**
   * 선택된 한 장은 고화질 우선.
   * 갤러리만 먼저 구현 중이므로 preview는 아직 안 쓰지만,
   * 탭한 셀은 더 빨리 선명해지게 유지.
   */
  const ensureSelectedThumbnailHighQuality = useCallback(
    async (assetId: string) => {
      if (highThumbnailMapRef.current.has(assetId)) return;
      if (highThumbnailLoadingRef.current.has(assetId)) return;

      highThumbnailLoadingRef.current.add(assetId);

      try {
        const uri = await JpMediaThumbnails.getThumbnail(assetId, {
          width: CELL_SIZE,
          height: CELL_SIZE,
          quality: 'high',
        });

        if (uri) {
          highThumbnailMapRef.current.set(assetId, uri);
          patchThumbnailUris([{ id: assetId, uri }]);
        }
      } catch (error) {
        console.log('[thumb][selected:high] failed', assetId, error);
      } finally {
        highThumbnailLoadingRef.current.delete(assetId);
      }
    },
    [patchThumbnailUris],
  );

  const resetAssetState = useCallback(() => {
    resetPickerSession();
  }, []);

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);

    try {
      const granted = await requestPermission();
      if (!granted) return;

      await loadAlbums();

      setActiveBucket('recent');
      setActiveAlbumId(null);
      setActiveAlbumTitle('최근 항목');
      resetAssetState();

      await loadAssets({
        reset: true,
        albumId: null,
        bucket: 'recent',
        first: INITIAL_LOAD_COUNT,
      });
    } finally {
      setBootstrapping(false);
    }
  }, [loadAlbums, loadAssets, requestPermission, resetAssetState]);

  useEffect(() => {
    return () => {
      if (fullFastTimerRef.current) {
        clearTimeout(fullFastTimerRef.current);
        fullFastTimerRef.current = null;
      }

      if (fullHighTimerRef.current) {
        clearTimeout(fullHighTimerRef.current);
        fullHighTimerRef.current = null;
      }

      if (autoPagingTimerRef.current) {
        clearTimeout(autoPagingTimerRef.current);
        autoPagingTimerRef.current = null;
      }
      autoPagingRunningRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (assets.length === 0) return;
    if (!hasNextPage) return;

    scheduleAutoPagination();
  }, [assets.length, hasNextPage, scheduleAutoPagination]);

  useEffect(() => {
    if (assets.length === 0) return;

    scheduleFullFastPreload();

    const timeout = setTimeout(() => {
      scheduleFullHighPreload();
    }, 80);

    return () => {
      clearTimeout(timeout);
    };
  }, [assets, scheduleFullFastPreload, scheduleFullHighPreload]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const applyBucket = useCallback(
    async (bucket: MediaBucketKey) => {
      setMenuOpen(false);
      resetAssetState();

      if (bucket === 'albums') {
        setAlbumsSheetOpen(true);
        return;
      }

      setActiveBucket(bucket);
      setActiveAlbumId(null);

      if (bucket === 'recent') {
        setActiveAlbumTitle('최근 항목');
      } else if (bucket === 'videos') {
        setActiveAlbumTitle('동영상');
      } else if (bucket === 'favorites') {
        setActiveAlbumTitle('즐겨찾기');
      }

      await loadAssets({
        reset: true,
        albumId: null,
        bucket,
        first: INITIAL_LOAD_COUNT,
      });
    },
    [loadAssets, resetAssetState],
  );

  const applyAlbum = useCallback(
    async (album: PickerAlbum) => {
      setAlbumsSheetOpen(false);
      setMenuOpen(false);
      resetAssetState();

      setActiveBucket('albums');
      setActiveAlbumId(album.id);
      setActiveAlbumTitle(album.title);

      await loadAssets({
        reset: true,
        albumId: album.id,
        bucket: 'albums',
        first: INITIAL_LOAD_COUNT,
      });
    },
    [loadAssets, resetAssetState],
  );

  const toggleAsset = useCallback(
    (assetId: string) => {
      /**
       * 사용자가 직접 탭한 셀은 고화질을 우선 확보.
       * preview를 다시 붙일 때도 그대로 재사용 가능.
       */
      ensureSelectedThumbnailHighQuality(assetId);

      if (!multiSelectEnabled) {
        setSelectedIds([assetId]);
        return;
      }

      setSelectedIds((prev) => {
        const exists = prev.includes(assetId);
        if (exists) {
          return prev.filter((id) => id !== assetId);
        }
        return [...prev, assetId];
      });
    },
    [ensureSelectedThumbnailHighQuality, multiSelectEnabled],
  );

  const onToggleMultiSelect = useCallback(() => {
    setMultiSelectEnabled((prev) => {
      const next = !prev;

      if (!next) {
        setSelectedIds((current) => (current.length > 0 ? [current[current.length - 1]] : []));
      }

      return next;
    });
  }, []);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedIds.forEach((id, index) => {
      map.set(id, index);
    });
    return map;
  }, [selectedIds]);

  const renderAsset = useCallback(
    ({ item }: ListRenderItemInfo<PickerAsset>) => {
      const isSelected = selectedIdSet.has(item.id);
      const selectedIndex = selectedIndexMap.get(item.id) ?? -1;

      return (
        <AssetCell
          item={item}
          assetId={item.id}
          isSelected={isSelected}
          selectedIndex={selectedIndex}
          multiSelectEnabled={multiSelectEnabled}
          onPressAsset={toggleAsset}
        />
      );
    },
    [multiSelectEnabled, selectedIdSet, selectedIndexMap, toggleAsset],
  );

  const onEndReached = useCallback(() => {
    if (!hasNextPage || loading || loadingMoreRef.current) return;

    loadingMoreRef.current = true;

    loadAssets({
      reset: false,
      albumId: activeAlbumId,
      bucket: activeBucket,
      first: PAGINATION_LOAD_COUNT,
    }).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [activeAlbumId, activeBucket, hasNextPage, loadAssets, loading]);

  if (bootstrapping || permissionGranted === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!permissionGranted) {
    return (
      <SafeAreaView style={styles.center}>
        <AppText style={styles.permissionTitle}>사진 접근 권한이 필요해요</AppText>
        <Pressable style={styles.primaryButton} onPress={bootstrap}>
          <AppText style={styles.primaryButtonText}>권한 다시 요청</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>새 게시물</AppText>

        <Pressable
          onPress={() => {
            console.log('next');
          }}
          disabled={selectedIds.length === 0}
        >
          <AppText style={[styles.nextText, selectedIds.length === 0 && styles.nextTextDisabled]}>
            다음
          </AppText>
        </Pressable>
      </View>

      {/* preview는 갤러리 안정화 후 다시 붙이는 걸 권장 */}

      <View style={styles.content}>
        <View style={styles.toolbar}>
          <Pressable style={styles.albumButton} onPress={() => setMenuOpen((prev) => !prev)}>
            <AppText style={styles.albumButtonText}>{activeAlbumTitle}</AppText>
            <AppText style={styles.albumButtonArrow}>▾</AppText>
          </Pressable>

          <Pressable style={styles.multiButton} onPress={onToggleMultiSelect}>
            <AppText style={styles.multiButtonText}>
              {multiSelectEnabled ? '취소' : '다중선택'}
            </AppText>
          </Pressable>
        </View>

        {menuOpen ? (
          <View style={styles.dropdown}>
            {ALBUM_MENU.map((item) => (
              <Pressable
                key={item.key}
                style={styles.dropdownItem}
                onPress={() => applyBucket(item.key)}
              >
                <AppText style={styles.dropdownItemText}>{item.label}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderAsset}
          numColumns={NUM_COLUMNS}
          style={styles.list}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          updateCellsBatchingPeriod={16}
          windowSize={9}
          removeClippedSubviews
          onEndReachedThreshold={0.15}
          onEndReached={onEndReached}
          getItemLayout={(_, index) => {
            const row = Math.floor(index / NUM_COLUMNS);
            return {
              length: CELL_SIZE,
              offset: CELL_SIZE * row,
              index,
            };
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>

      <Modal
        visible={albumsSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAlbumsSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setAlbumsSheetOpen(false)}>
          <View style={styles.sheet}>
            <AppText style={styles.sheetTitle}>모든 사진첩</AppText>

            <FlatList
              data={albums}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.sheetItem} onPress={() => applyAlbum(item)}>
                  <AppText style={styles.sheetItemText}>{item.title}</AppText>
                  <AppText style={styles.sheetItemCount}>{item.count}</AppText>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  center: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d9d9d9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3d5afe',
  },
  nextTextDisabled: {
    color: '#b9c2ff',
  },
  toolbar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  albumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  albumButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  albumButtonArrow: {
    fontSize: 14,
    color: '#555',
  },
  multiButton: {
    minWidth: 84,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f5',
  },
  multiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 20,
    width: 180,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    paddingVertical: 8,
  },
  dropdownItem: {
    height: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111',
  },
  cell: {
    width: '33.3333%',
    aspectRatio: 1,
    padding: 1,
    backgroundColor: '#ffffff',
  },
  cellImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ececec',
  },
  cellPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3d5afe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBadgeEmpty: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  selectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: 16,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.24)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    maxHeight: '70%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sheetItem: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetItemText: {
    fontSize: 15,
    color: '#111',
  },
  sheetItemCount: {
    fontSize: 13,
    color: '#777',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#3d5afe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
