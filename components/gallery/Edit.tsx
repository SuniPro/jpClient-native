import * as MediaLibrary from 'expo-media-library';
import JpMediaThumbnails from '@/modules/jp-media-thumbnails';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../Text';
import {
  AlbumMenuItem,
  MediaBucketKey,
  NativeAlbum,
  NativeGalleryAsset,
  PickerAsset,
} from './types';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 4;
const CELL_SIZE = Math.floor(SCREEN_WIDTH / NUM_COLUMNS);

const PREVIEW_MAX_HEIGHT = SCREEN_WIDTH;
const PREVIEW_MIN_HEIGHT = 0;

const INITIAL_LOAD_COUNT = 80;
const PAGINATION_LOAD_COUNT = 80;

const ALBUM_MENU: AlbumMenuItem[] = [
  { key: 'recent', label: '최근 항목' },
  { key: 'videos', label: '동영상' },
  { key: 'favorites', label: '즐겨찾기' },
  { key: 'albums', label: '모든 사진첩' },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<PickerAsset>);

function toPickerAssetFromNative(asset: NativeGalleryAsset): PickerAsset {
  return {
    id: asset.id,
    uri: `ph://${asset.id}`,
    thumbnailUri: null,
    mediaType: asset.mediaType,
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

function makeSourceKey(bucket: MediaBucketKey, albumId: string) {
  return `${bucket}:${albumId}`;
}

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
    <Pressable style={styles.cell} onPress={() => onPressAsset(assetId)}>
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

      {item.mediaType === 'video' ? (
        <View style={styles.videoBadge}>
          <AppText style={styles.videoBadgeText}>VIDEO</AppText>
        </View>
      ) : null}

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

export default function PostMediaPickerScreen() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [albums, setAlbums] = useState<NativeAlbum[]>([]);
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
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const [systemAlbumIds, setSystemAlbumIds] = useState<{
    recent: string | null;
    favorites: string | null;
    videos: string | null;
  }>({
    recent: null,
    favorites: null,
    videos: null,
  });

  const fastThumbnailMapRef = useRef<Map<string, string>>(new Map());
  const highThumbnailMapRef = useRef<Map<string, string>>(new Map());
  const highThumbnailLoadingRef = useRef<Set<string>>(new Set());

  const pendingThumbnailPatchMapRef = useRef<Map<string, string>>(new Map());
  const patchFlushScheduledRef = useRef(false);
  const patchFlushAnimationFrameRef = useRef<number | null>(null);

  const endCursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const autoPagingRunningRef = useRef(false);
  const autoPagingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastPreloadSignatureRef = useRef('');
  const currentAssetIdSetRef = useRef<Set<string>>(new Set());

  const currentSourceGenerationRef = useRef<number>(0);

  const previewHeight = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const selectedCount = useSharedValue(0);

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
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const loadAlbums = useCallback(async () => {
    try {
      const result = await JpMediaThumbnails.getAlbums();

      const mapped: NativeAlbum[] = result.map((album) => ({
        id: album.id,
        title: album.title,
        count: album.count,
        type: album.type,
      }));

      setAlbums(mapped);

      setSystemAlbumIds({
        recent: result.find((item) => item.title === 'Recents')?.id ?? null,
        favorites: result.find((item) => item.title === 'Favorites')?.id ?? null,
        videos: result.find((item) => item.title === 'Videos')?.id ?? null,
      });
    } catch {
      // noop
    }
  }, []);

  const patchThumbnailUris = useCallback((entries: Array<{ id: string; uri: string | null }>) => {
    if (entries.length === 0) return;

    const patchMap = new Map(
      entries
        .filter((entry): entry is { id: string; uri: string } => Boolean(entry.uri))
        .map((entry) => [entry.id, entry.uri]),
    );

    if (patchMap.size === 0) return;

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

  const flushPendingThumbnailPatches = useCallback(() => {
    patchFlushScheduledRef.current = false;
    patchFlushAnimationFrameRef.current = null;

    const entries = Array.from(pendingThumbnailPatchMapRef.current.entries()).map(([id, uri]) => ({
      id,
      uri,
    }));

    pendingThumbnailPatchMapRef.current.clear();

    if (entries.length > 0) {
      patchThumbnailUris(entries);
    }
  }, [patchThumbnailUris]);

  const enqueueThumbnailPatch = useCallback(
    (assetId: string, uri: string) => {
      const prev = pendingThumbnailPatchMapRef.current.get(assetId);
      if (prev === uri) return;

      pendingThumbnailPatchMapRef.current.set(assetId, uri);

      if (patchFlushScheduledRef.current) return;

      patchFlushScheduledRef.current = true;

      patchFlushAnimationFrameRef.current = requestAnimationFrame(() => {
        flushPendingThumbnailPatches();
      });
    },
    [flushPendingThumbnailPatches],
  );

  const loadAssets = useCallback(
    async ({
      reset,
      albumId,
      first,
    }: {
      reset: boolean;
      albumId: string | null;
      first: number;
    }) => {
      if (!albumId) return null;
      if (loadingRef.current) return null;

      loadingRef.current = true;
      setLoading(true);

      try {
        const result = await JpMediaThumbnails.getAssetsInAlbum(
          albumId,
          first,
          reset ? null : endCursorRef.current,
        );

        const mapped = result.assets.map(toPickerAssetFromNative);

        setAssets((prev) => {
          if (reset) {
            return mapped;
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const deduped = mapped.filter((item) => !existingIds.has(item.id));
          return [...prev, ...deduped];
        });

        endCursorRef.current = result.endCursor ?? null;
        setHasNextPage(result.hasNextPage);

        return result;
      } catch {
        return null;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    currentAssetIdSetRef.current = new Set(assets.map((item) => item.id));
  }, [assets]);

  useEffect(() => {
    JpMediaThumbnails.debugGetPreloadGeneration()
      .then((generation) => {
        console.log('[debugGetPreloadGeneration]', {
          activeBucket,
          activeAlbumId,
          generation,
          sourceGeneration: currentSourceGenerationRef.current,
        });
      })
      .catch((error) => {
        console.log('[debugGetPreloadGeneration][failed]', error);
      });
  }, [activeBucket, activeAlbumId]);

  useEffect(() => {
    if (assets.length === 0) return;

    const assetIds = assets.map((item) => item.id);
    const signature = assetIds.join(',');

    if (signature === lastPreloadSignatureRef.current) {
      return;
    }

    lastPreloadSignatureRef.current = signature;

    JpMediaThumbnails.debugGetPreloadGeneration()
      .then((generation) => {
        console.log('[startPreloading target]', {
          activeBucket,
          activeAlbumId,
          assetsLength: assets.length,
          firstId: assetIds[0],
          generation,
          sourceGeneration: currentSourceGenerationRef.current,
        });
      })
      .catch(() => {});

    JpMediaThumbnails.startPreloading(assetIds, {
      width: CELL_SIZE,
      height: CELL_SIZE,
      fastBatchSize: 48,
      highBatchSize: 12,
    }).catch(() => {});
  }, [activeAlbumId, activeBucket, assets]);

  useEffect(() => {
    const subscription = JpMediaThumbnails.addListener(
      'onThumbnailReady',
      ({ assetId, quality, uri, sourceGeneration }) => {
        if (!uri) return;

        if (sourceGeneration < currentSourceGenerationRef.current) {
          return;
        }

        if (!currentAssetIdSetRef.current.has(assetId)) {
          return;
        }

        if (quality === 'high') {
          const prevHigh = highThumbnailMapRef.current.get(assetId);
          if (prevHigh === uri) return;

          highThumbnailMapRef.current.set(assetId, uri);
          fastThumbnailMapRef.current.set(assetId, uri);
          enqueueThumbnailPatch(assetId, uri);
          return;
        }

        if (highThumbnailMapRef.current.has(assetId)) {
          return;
        }

        const prevFast = fastThumbnailMapRef.current.get(assetId);
        if (prevFast === uri) return;

        fastThumbnailMapRef.current.set(assetId, uri);
        enqueueThumbnailPatch(assetId, uri);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [enqueueThumbnailPatch]);

  const getAlbumIdForBucket = useCallback(
    (bucket: MediaBucketKey, explicitAlbumId: string | null) => {
      if (bucket === 'recent') return systemAlbumIds.recent;
      if (bucket === 'favorites') return systemAlbumIds.favorites;
      if (bucket === 'videos') return systemAlbumIds.videos;
      if (bucket === 'albums') return explicitAlbumId;
      return null;
    },
    [systemAlbumIds],
  );

  const resetPickerSession = useCallback(() => {
    endCursorRef.current = null;

    fastThumbnailMapRef.current.clear();
    highThumbnailMapRef.current.clear();
    highThumbnailLoadingRef.current.clear();

    pendingThumbnailPatchMapRef.current.clear();
    patchFlushScheduledRef.current = false;
    currentAssetIdSetRef.current.clear();

    if (patchFlushAnimationFrameRef.current != null) {
      cancelAnimationFrame(patchFlushAnimationFrameRef.current);
      patchFlushAnimationFrameRef.current = null;
    }

    if (autoPagingTimerRef.current) {
      clearTimeout(autoPagingTimerRef.current);
      autoPagingTimerRef.current = null;
    }
    autoPagingRunningRef.current = false;

    lastPreloadSignatureRef.current = '';

    setAssets([]);
    setSelectedIds([]);
    setHasNextPage(true);
    setActivePreviewId(null);
  }, []);

  const beginNewSource = useCallback(async (bucket: MediaBucketKey, albumId: string | null) => {
    if (!albumId) {
      throw new Error(`beginNewSource called without albumId for bucket: ${bucket}`);
    }

    const nextSourceKey = makeSourceKey(bucket, albumId);
    const nextGeneration = await JpMediaThumbnails.setActiveSource(nextSourceKey);
    currentSourceGenerationRef.current = nextGeneration;

    console.log('[setActiveSource]', {
      sourceKey: nextSourceKey,
      sourceGeneration: nextGeneration,
    });

    return nextGeneration;
  }, []);

  const scheduleAutoPagination = useCallback(() => {
    if (autoPagingTimerRef.current) {
      clearTimeout(autoPagingTimerRef.current);
    }

    autoPagingTimerRef.current = setTimeout(async () => {
      if (autoPagingRunningRef.current) return;
      if (!hasNextPage) return;
      if (loadingRef.current || loadingMoreRef.current) return;
      if (!activeAlbumId) return;

      autoPagingRunningRef.current = true;
      loadingMoreRef.current = true;

      try {
        const result = await loadAssets({
          reset: false,
          albumId: activeAlbumId,
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
  }, [activeAlbumId, hasNextPage, loadAssets]);

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
          fastThumbnailMapRef.current.set(assetId, uri);
          enqueueThumbnailPatch(assetId, uri);
        }
      } finally {
        highThumbnailLoadingRef.current.delete(assetId);
      }
    },
    [enqueueThumbnailPatch],
  );

  const resetAssetState = useCallback(() => {
    resetPickerSession();
  }, [resetPickerSession]);

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
    } finally {
      setBootstrapping(false);
    }
  }, [loadAlbums, requestPermission, resetAssetState]);

  useEffect(() => {
    return () => {
      try {
        JpMediaThumbnails.stopPreloading();
      } catch {
        // noop
      }

      pendingThumbnailPatchMapRef.current.clear();
      patchFlushScheduledRef.current = false;

      if (patchFlushAnimationFrameRef.current != null) {
        cancelAnimationFrame(patchFlushAnimationFrameRef.current);
        patchFlushAnimationFrameRef.current = null;
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
    bootstrap().then();
  }, [bootstrap]);

  useEffect(() => {
    if (!systemAlbumIds.recent) return;

    const initializeRecent = async () => {
      const nextAlbumId = systemAlbumIds.recent;
      if (!nextAlbumId) return;

      resetAssetState();

      setActiveBucket('recent');
      setActiveAlbumId(nextAlbumId);
      setActiveAlbumTitle('최근 항목');

      await beginNewSource('recent', nextAlbumId);

      await loadAssets({
        reset: true,
        albumId: nextAlbumId,
        first: INITIAL_LOAD_COUNT,
      });
    };

    initializeRecent().catch((error) => {
      console.log('[initializeRecent][failed]', error);
    });
  }, [beginNewSource, loadAssets, resetAssetState, systemAlbumIds.recent]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setActivePreviewId(null);
      return;
    }

    setActivePreviewId((current) => {
      if (current && selectedIds.includes(current)) {
        return current;
      }
      return selectedIds[selectedIds.length - 1];
    });
  }, [selectedIds]);

  const selectedAssets = useMemo(() => {
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    return selectedIds
      .map((id) => assetMap.get(id))
      .filter((asset): asset is PickerAsset => Boolean(asset));
  }, [assets, selectedIds]);

  const activePreviewAsset = useMemo(() => {
    if (!activePreviewId) return null;
    return selectedAssets.find((asset) => asset.id === activePreviewId) ?? null;
  }, [activePreviewId, selectedAssets]);

  const activePreviewUri = activePreviewAsset?.thumbnailUri ?? null;

  useEffect(() => {
    selectedCount.value = selectedIds.length;
  }, [selectedCount, selectedIds.length]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      previewHeight.value = withTiming(PREVIEW_MIN_HEIGHT, { duration: 220 });
      return;
    }

    previewHeight.value = withTiming(PREVIEW_MAX_HEIGHT, { duration: 220 });
  }, [previewHeight, selectedIds.length]);

  const onListScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const nextY = event.contentOffset.y;
      const deltaY = nextY - scrollY.value;

      scrollY.value = nextY;

      if (selectedCount.value <= 0) {
        return;
      }

      if (deltaY > 0 && previewHeight.value > PREVIEW_MIN_HEIGHT) {
        previewHeight.value = Math.max(PREVIEW_MIN_HEIGHT, previewHeight.value - deltaY);
        return;
      }

      if (deltaY < 0 && previewHeight.value < PREVIEW_MAX_HEIGHT) {
        previewHeight.value = Math.min(PREVIEW_MAX_HEIGHT, previewHeight.value + Math.abs(deltaY));
      }
    },
    onEndDrag: () => {
      if (selectedCount.value <= 0) return;

      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;
      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    },
    onMomentumEnd: () => {
      if (selectedCount.value <= 0) return;

      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;
      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    },
  });

  const listNativeGesture = Gesture.Native();

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(listNativeGesture)
    .activeOffsetY([-3, 3])
    .onBegin(() => {
      if (selectedCount.value <= 0) return;
      dragStartHeight.value = previewHeight.value;
    })
    .onUpdate((event) => {
      if (selectedCount.value <= 0) return;

      const isPullingDown = event.translationY > 0;
      const isPushingUp = event.translationY < 0;
      const listAtTop = scrollY.value <= 0;

      const shouldHandlePanel =
        (listAtTop && isPullingDown) || (previewHeight.value > PREVIEW_MIN_HEIGHT && isPushingUp);

      if (!shouldHandlePanel) {
        return;
      }

      const adjustedTranslationY =
        event.translationY < 0 ? event.translationY * 1.35 : event.translationY;

      const nextHeight = Math.max(
        PREVIEW_MIN_HEIGHT,
        Math.min(PREVIEW_MAX_HEIGHT, dragStartHeight.value + adjustedTranslationY),
      );

      previewHeight.value = nextHeight;
    })
    .onEnd(() => {
      if (selectedCount.value <= 0) {
        previewHeight.value = withTiming(PREVIEW_MIN_HEIGHT, { duration: 220 });
        return;
      }

      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;
      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    });

  const previewAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: previewHeight.value,
      opacity: PREVIEW_MAX_HEIGHT === 0 ? 0 : previewHeight.value / PREVIEW_MAX_HEIGHT,
    };
  });

  const applyBucket = useCallback(
    async (bucket: MediaBucketKey) => {
      setMenuOpen(false);

      if (bucket === 'albums') {
        setAlbumsSheetOpen(true);
        return;
      }

      const nextAlbumId = getAlbumIdForBucket(bucket, null);
      if (!nextAlbumId) {
        console.log('[applyBucket] missing album id for bucket', { bucket });
        return;
      }

      resetAssetState();

      setActiveBucket(bucket);
      setActiveAlbumId(nextAlbumId);

      if (bucket === 'recent') {
        setActiveAlbumTitle('최근 항목');
      } else if (bucket === 'videos') {
        setActiveAlbumTitle('동영상');
      } else if (bucket === 'favorites') {
        setActiveAlbumTitle('즐겨찾기');
      }

      await beginNewSource(bucket, nextAlbumId);

      await loadAssets({
        reset: true,
        albumId: nextAlbumId,
        first: INITIAL_LOAD_COUNT,
      });
    },
    [beginNewSource, getAlbumIdForBucket, loadAssets, resetAssetState],
  );

  const applyAlbum = useCallback(
    async (album: NativeAlbum) => {
      setAlbumsSheetOpen(false);
      setMenuOpen(false);
      resetAssetState();

      setActiveBucket('albums');
      setActiveAlbumId(album.id);
      setActiveAlbumTitle(album.title);

      await beginNewSource('albums', album.id);

      await loadAssets({
        reset: true,
        albumId: album.id,
        first: INITIAL_LOAD_COUNT,
      });
    },
    [beginNewSource, loadAssets, resetAssetState],
  );

  const toggleAsset = useCallback(
    (assetId: string) => {
      ensureSelectedThumbnailHighQuality(assetId).then();

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
    if (!activeAlbumId) return;

    loadingMoreRef.current = true;

    loadAssets({
      reset: false,
      albumId: activeAlbumId,
      first: PAGINATION_LOAD_COUNT,
    }).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [activeAlbumId, hasNextPage, loadAssets, loading]);

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
            // next
          }}
          disabled={selectedIds.length === 0}
        >
          <AppText style={[styles.nextText, selectedIds.length === 0 && styles.nextTextDisabled]}>
            다음
          </AppText>
        </Pressable>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.previewArea, previewAnimatedStyle]}>
          {activePreviewUri ? (
            <>
              <View style={styles.previewMain}>
                <Image
                  source={{ uri: activePreviewUri }}
                  style={styles.previewImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              </View>

              <View style={styles.previewStripContainer}>
                <FlatList
                  horizontal
                  data={selectedAssets}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewStripContent}
                  renderItem={({ item }) => {
                    const isActive = item.id === activePreviewId;

                    return (
                      <Pressable
                        onPress={() => setActivePreviewId(item.id)}
                        style={[styles.previewStripItem, isActive && styles.previewStripItemActive]}
                      >
                        {item.thumbnailUri ? (
                          <Image
                            source={{ uri: item.thumbnailUri }}
                            style={styles.previewStripImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={0}
                          />
                        ) : (
                          <View style={styles.previewStripPlaceholder} />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </View>
            </>
          ) : (
            <View style={styles.previewPlaceholder}>
              <AppText style={styles.previewPlaceholderText}>선택한 이미지 미리보기</AppText>
            </View>
          )}
        </Animated.View>
      </GestureDetector>

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

        <AnimatedFlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderAsset}
          numColumns={NUM_COLUMNS}
          style={styles.list}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          updateCellsBatchingPeriod={16}
          windowSize={9}
          removeClippedSubviews={false}
          onEndReachedThreshold={0.15}
          onEndReached={onEndReached}
          onScroll={onListScroll}
          scrollEventThrottle={16}
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
  previewArea: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewMain: {
    flex: 1,
    width: '100%',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewStripContainer: {
    height: 76,
    paddingVertical: 8,
    backgroundColor: '#111',
  },
  previewStripContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  previewStripItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  previewStripItemActive: {
    borderColor: '#fff',
  },
  previewStripImage: {
    width: '100%',
    height: '100%',
  },
  previewStripPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  previewPlaceholderText: {
    color: '#fff',
    fontSize: 14,
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
    width: CELL_SIZE,
    height: CELL_SIZE,
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
