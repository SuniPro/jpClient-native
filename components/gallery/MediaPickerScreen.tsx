import * as MediaLibrary from 'expo-media-library';
import JpMediaThumbnails, { NativeAlbum, NativeGalleryAsset } from '@/modules/jp-media-thumbnails';
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
import { AlbumMenuItem, MediaBucketKey, PickerAsset } from './types';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CircleCancel } from '@/assets/icons/icon';
import { usePostGalleryStore } from '@/stores/post-gallery.store';
import { router } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 4;
const CELL_SIZE = Math.floor(SCREEN_WIDTH / NUM_COLUMNS);

const PREVIEW_MAX_HEIGHT = SCREEN_WIDTH;
const PREVIEW_MIN_HEIGHT = 0;

const INITIAL_LOAD_COUNT = 1000;
const PAGINATION_LOAD_COUNT = 1000;

const ALBUM_MENU: AlbumMenuItem[] = [
  {
    key: 'recent',
    label: '최근 항목',
  },
  {
    key: 'videos',
    label: '동영상',
  },
  {
    key: 'favorites',
    label: '즐겨찾기',
  },
  {
    key: 'albums',
    label: '모든 사진첩',
  },
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
          source={{
            uri: item.thumbnailUri,
          }}
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

export default function MediaPickerScreen() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const [albums, setAlbums] = useState<NativeAlbum[]>([]);

  const assets = usePostGalleryStore((state) => state.assets);

  const activeAlbumId = usePostGalleryStore((state) => state.activeAlbumId);

  const activeAlbumTitle = usePostGalleryStore((state) => state.activeAlbumTitle);

  const selectedIds = usePostGalleryStore((state) => state.selectedIds);

  const multiSelectEnabled = usePostGalleryStore((state) => state.multiSelectEnabled);

  const hasNextPage = usePostGalleryStore((state) => state.hasNextPage);

  const activePreviewId = usePostGalleryStore((state) => state.activePreviewId);

  const endCursor = usePostGalleryStore((state) => state.endCursor);

  const setAssets = usePostGalleryStore((state) => state.setAssets);

  const appendAssets = usePostGalleryStore((state) => state.appendAssets);

  const setGalleryMeta = usePostGalleryStore((state) => state.setGalleryMeta);

  const setSelectedIds = usePostGalleryStore((state) => state.setSelectedIds);

  const removeSelected = usePostGalleryStore((state) => state.removeSelected);

  const clearSelection = usePostGalleryStore((state) => state.clearSelection);

  const setSelection = usePostGalleryStore((state) => state.setSelection);

  const updateAssetThumbnails = usePostGalleryStore((state) => state.updateAssetThumbnails);

  const [menuOpen, setMenuOpen] = useState(false);

  const [albumsSheetOpen, setAlbumsSheetOpen] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(true);

  const [loading, setLoading] = useState(false);

  const [systemAlbumIds, setSystemAlbumIds] = useState<{
    recent: string | null;
    favorites: string | null;
    videos: string | null;
  }>({
    recent: null,
    favorites: null,
    videos: null,
  });

  const endCursorRef = useRef<string | null>(null);

  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const previewHeight = useSharedValue(0);

  const dragStartHeight = useSharedValue(0);

  const scrollY = useSharedValue(0);

  const selectedCount = useSharedValue(0);

  const hasRestorableSession = assets.length > 0 && activeAlbumId != null;

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
        systemKey: album.systemKey,
      }));

      setAlbums(mapped);

      setSystemAlbumIds({
        recent: result.find((item) => item.systemKey === 'recent')?.id ?? null,

        favorites: result.find((item) => item.systemKey === 'favorites')?.id ?? null,

        videos: result.find((item) => item.systemKey === 'videos')?.id ?? null,
      });
    } catch (error) {
      console.error('[loadAlbums][failed]', error);
    }
  }, []);

  /**
   * Loads thumbnail URIs for exactly the
   * assets passed by the current page.
   *
   * startPreloading() only warms PhotoKit's
   * cache. getThumbnailBatch() is the actual
   * URI-producing operation.
   */
  const loadThumbnails = useCallback(
    async (assetIds: string[]) => {
      if (assetIds.length === 0) {
        return;
      }

      const options = {
        width: CELL_SIZE,
        height: CELL_SIZE,
      };

      console.log('[loadThumbnails:start]', assetIds.length);

      try {
        void JpMediaThumbnails.startPreloading(assetIds, options).catch((error) => {
          console.error('[startPreloading][failed]', error);
        });

        const results = await JpMediaThumbnails.getThumbnailBatch(assetIds, options);

        const successCount = Object.values(results).filter((uri) => Boolean(uri)).length;

        console.log('[loadThumbnails:done]', assetIds.length, successCount);

        const patches = Object.entries(results).flatMap(([id, uri]) =>
          uri
            ? [
                {
                  id,
                  uri,
                },
              ]
            : [],
        );

        if (patches.length === 0) {
          return;
        }

        updateAssetThumbnails(patches);
      } catch (error) {
        console.error('[getThumbnailBatch][failed]', error);
      }
    },
    [updateAssetThumbnails],
  );

  /**
   * Fetches one page of gallery assets.
   *
   * Thumbnail loading is started directly
   * from the returned page instead of being
   * driven by an `assets` useEffect.
   */
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
      if (!albumId) {
        return null;
      }

      if (loadingRef.current) {
        return null;
      }

      loadingRef.current = true;
      setLoading(true);

      try {
        const result = await JpMediaThumbnails.getAssetsInAlbum(
          albumId,
          first,
          reset ? null : endCursorRef.current,
        );

        console.log('[loadAssets]', result.assets.length);

        const mapped = result.assets.map(toPickerAssetFromNative);

        if (reset) {
          setAssets(mapped);
        } else {
          appendAssets(mapped);
        }

        const assetIds = result.assets.map((asset) => asset.id);

        // Intentionally not awaited.
        // Asset pagination should not wait for
        // JPEG/file URI generation to finish.
        void loadThumbnails(assetIds);

        endCursorRef.current = result.endCursor ?? null;

        setGalleryMeta({
          endCursor: result.endCursor ?? null,
          hasNextPage: result.hasNextPage,
        });

        return result;
      } catch (error) {
        console.error('[loadAssets][failed]', error);

        return null;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [appendAssets, loadThumbnails, setAssets, setGalleryMeta],
  );

  /**
   * Restore the pagination cursor from the
   * persisted gallery store.
   */
  useEffect(() => {
    endCursorRef.current = endCursor;
  }, [endCursor]);

  const getAlbumIdForBucket = useCallback(
    (bucket: MediaBucketKey, explicitAlbumId: string | null) => {
      if (bucket === 'recent') {
        return systemAlbumIds.recent;
      }

      if (bucket === 'favorites') {
        return systemAlbumIds.favorites;
      }

      if (bucket === 'videos') {
        return systemAlbumIds.videos;
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (bucket === 'albums') {
        return explicitAlbumId;
      }

      return null;
    },
    [systemAlbumIds],
  );

  const resetPickerSession = useCallback(() => {
    endCursorRef.current = null;

    setAssets([]);
    clearSelection();

    setGalleryMeta({
      hasNextPage: true,
      activePreviewId: null,
      endCursor: null,
    });
  }, [clearSelection, setAssets, setGalleryMeta]);

  const resetAssetState = useCallback(() => {
    resetPickerSession();
  }, [resetPickerSession]);

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);

    try {
      const granted = await requestPermission();

      if (!granted) {
        return;
      }

      await loadAlbums();

      if (hasRestorableSession) {
        return;
      }

      setGalleryMeta({
        activeBucket: 'recent',
        activeAlbumId: null,
        activeAlbumTitle: '최근 항목',
      });

      resetAssetState();
    } finally {
      setBootstrapping(false);
    }
  }, [hasRestorableSession, loadAlbums, requestPermission, resetAssetState, setGalleryMeta]);

  /**
   * Screen cleanup only.
   *
   * IMPORTANT:
   * bootstrap() must never be called from
   * this cleanup.
   */
  useEffect(
    () => () => {
      void JpMediaThumbnails.stopPreloading().catch((error) => {
        console.error('[stopPreloading][failed]', error);
      });
    },
    [],
  );

  /**
   * Initial permission / album bootstrap.
   *
   * A restored session already has assets and
   * an active album, so it does not need to
   * reset the gallery.
   */
  useEffect(() => {
    if (hasRestorableSession) {
      return;
    }

    void bootstrap();
  }, [bootstrap, hasRestorableSession]);

  /**
   * Once Recents has been discovered,
   * load the initial page.
   */
  useEffect(() => {
    if (hasRestorableSession) {
      return;
    }

    if (!systemAlbumIds.recent) {
      return;
    }

    const initializeRecent = async () => {
      const nextAlbumId = systemAlbumIds.recent;

      if (!nextAlbumId) {
        return;
      }

      resetAssetState();

      setGalleryMeta({
        activeBucket: 'recent',
        activeAlbumId: nextAlbumId,
        activeAlbumTitle: '최근 항목',
      });

      await loadAssets({
        reset: true,
        albumId: nextAlbumId,
        first: INITIAL_LOAD_COUNT,
      });
    };

    void initializeRecent().catch((error) => {
      console.error('[initializeRecent][failed]', error);
    });
  }, [hasRestorableSession, loadAssets, resetAssetState, setGalleryMeta, systemAlbumIds.recent]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setGalleryMeta({
        activePreviewId: null,
      });

      return;
    }

    const nextActivePreviewId =
      activePreviewId && selectedIds.includes(activePreviewId)
        ? activePreviewId
        : (selectedIds[selectedIds.length - 1] ?? null);

    setGalleryMeta({
      activePreviewId: nextActivePreviewId,
    });
  }, [activePreviewId, selectedIds, setGalleryMeta]);

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const selectedAssets = useMemo(
    () =>
      selectedIds
        .map((id) => assetMap.get(id))
        .filter((asset): asset is PickerAsset => Boolean(asset)),
    [assetMap, selectedIds],
  );

  const activePreviewAsset = useMemo(() => {
    if (!activePreviewId) {
      return null;
    }

    return selectedAssets.find((asset) => asset.id === activePreviewId) ?? null;
  }, [activePreviewId, selectedAssets]);

  const activePreviewUri = activePreviewAsset?.thumbnailUri ?? null;

  useEffect(() => {
    selectedCount.value = selectedIds.length;
  }, [selectedCount, selectedIds.length]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      previewHeight.value = withTiming(PREVIEW_MIN_HEIGHT, {
        duration: 220,
      });

      return;
    }

    previewHeight.value = withTiming(PREVIEW_MAX_HEIGHT, {
      duration: 220,
    });
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
      if (selectedCount.value <= 0) {
        return;
      }

      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;

      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    },

    onMomentumEnd: () => {
      if (selectedCount.value <= 0) {
        return;
      }

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
      if (selectedCount.value <= 0) {
        return;
      }

      dragStartHeight.value = previewHeight.value;
    })
    .onUpdate((event) => {
      if (selectedCount.value <= 0) {
        return;
      }

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

      previewHeight.value = Math.max(
        PREVIEW_MIN_HEIGHT,
        Math.min(PREVIEW_MAX_HEIGHT, dragStartHeight.value + adjustedTranslationY),
      );
    })
    .onEnd(() => {
      if (selectedCount.value <= 0) {
        previewHeight.value = withTiming(PREVIEW_MIN_HEIGHT, {
          duration: 220,
        });

        return;
      }

      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;

      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    });

  const previewAnimatedStyle = useAnimatedStyle(() => ({
    height: previewHeight.value,
    opacity: PREVIEW_MAX_HEIGHT === 0 ? 0 : previewHeight.value / PREVIEW_MAX_HEIGHT,
  }));

  const applyBucket = useCallback(
    async (bucket: MediaBucketKey) => {
      setMenuOpen(false);

      if (bucket === 'albums') {
        setAlbumsSheetOpen(true);
        return;
      }

      const nextAlbumId = getAlbumIdForBucket(bucket, null);

      if (!nextAlbumId) {
        console.error('[applyBucket] missing album id for bucket', {
          bucket,
        });

        return;
      }

      await JpMediaThumbnails.stopPreloading();

      resetAssetState();

      const nextTitle =
        bucket === 'recent' ? '최근 항목' : bucket === 'videos' ? '동영상' : '즐겨찾기';

      setGalleryMeta({
        activeBucket: bucket,
        activeAlbumId: nextAlbumId,
        activeAlbumTitle: nextTitle,
      });

      await loadAssets({
        reset: true,
        albumId: nextAlbumId,
        first: INITIAL_LOAD_COUNT,
      });
    },
    [getAlbumIdForBucket, loadAssets, resetAssetState, setGalleryMeta],
  );

  const applyAlbum = useCallback(
    async (album: NativeAlbum) => {
      setAlbumsSheetOpen(false);
      setMenuOpen(false);

      await JpMediaThumbnails.stopPreloading();

      resetAssetState();

      setGalleryMeta({
        activeBucket: 'albums',
        activeAlbumId: album.id,
        activeAlbumTitle: album.title,
      });

      await loadAssets({
        reset: true,
        albumId: album.id,
        first: INITIAL_LOAD_COUNT,
      });
    },
    [loadAssets, resetAssetState, setGalleryMeta],
  );

  const toggleAsset = useCallback(
    (assetId: string) => {
      if (!multiSelectEnabled) {
        setSelectedIds([assetId]);
        return;
      }

      const exists = selectedIds.includes(assetId);

      if (exists) {
        setSelectedIds(selectedIds.filter((id) => id !== assetId));

        return;
      }

      setSelectedIds([...selectedIds, assetId]);
    },
    [multiSelectEnabled, selectedIds, setSelectedIds],
  );

  const onToggleMultiSelect = useCallback(() => {
    const next = !multiSelectEnabled;

    if (!next) {
      setSelectedIds(selectedIds.length > 0 ? [selectedIds[selectedIds.length - 1]] : []);
    }

    setGalleryMeta({
      multiSelectEnabled: next,
    });
  }, [multiSelectEnabled, selectedIds, setGalleryMeta, setSelectedIds]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();

    selectedIds.forEach((id, index) => {
      map.set(id, index);
    });

    return map;
  }, [selectedIds]);

  const nextHandler = () => {
    setSelection(selectedAssets);

    router.push('/post/selectedMediaEdit');
  };

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
    if (!hasNextPage || loading || loadingMoreRef.current) {
      return;
    }

    if (!activeAlbumId) {
      return;
    }

    loadingMoreRef.current = true;

    void loadAssets({
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

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            void bootstrap();
          }}
        >
          <AppText style={styles.primaryButtonText}>권한 다시 요청</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>새 게시물</AppText>

        <Pressable onPress={nextHandler} disabled={selectedIds.length === 0}>
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
                  source={{
                    uri: activePreviewUri,
                  }}
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
                      <View
                        style={[styles.previewStripItem, isActive && styles.previewStripItemActive]}
                      >
                        <Pressable
                          onPress={() =>
                            setGalleryMeta({
                              activePreviewId: item.id,
                            })
                          }
                        >
                          {item.thumbnailUri ? (
                            <>
                              <Image
                                source={{
                                  uri: item.thumbnailUri,
                                }}
                                style={styles.previewStripImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={0}
                              />

                              <Pressable
                                onPress={() => removeSelected(item.id)}
                                style={styles.previewRemoveButton}
                              >
                                <CircleCancel width={16} height={16} color="#000000" />
                              </Pressable>
                            </>
                          ) : (
                            <View style={styles.previewStripPlaceholder} />
                          )}
                        </Pressable>
                      </View>
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
                onPress={() => {
                  void applyBucket(item.key);
                }}
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
                <Pressable
                  style={styles.sheetItem}
                  onPress={() => {
                    void applyAlbum(item);
                  }}
                >
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

  previewRemoveButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowOffset: {
      width: 0,
      height: 8,
    },
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
