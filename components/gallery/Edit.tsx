import * as MediaLibrary from 'expo-media-library';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../Text';
import { AlbumMenuItem, MediaBucketKey, PickerAlbum, PickerAsset } from './types';

export type RawMediaAsset = MediaLibrary.Asset;

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_MAX_HEIGHT = 220;
const PREVIEW_MIN_HEIGHT = 0;
const SNAP_THRESHOLD = PREVIEW_MAX_HEIGHT * 0.5;

const CELL_SIZE = Math.floor(SCREEN_WIDTH / 3);

const PAGE_SIZE = 30;
const INITIAL_RESOLVE_COUNT = 12;

const ALBUM_MENU: AlbumMenuItem[] = [
  { key: 'recent', label: '최근 항목' },
  { key: 'videos', label: '동영상' },
  { key: 'favorites', label: '즐겨찾기' },
  { key: 'albums', label: '모든 사진첩' },
];

async function mapAsset(asset: MediaLibrary.Asset): Promise<PickerAsset> {
  let resolvedUri = asset.uri;

  // ios의 경우 ph:// 형태로 시작하기에 해당 에러 방지를 위해 이렇게 수정합니다.
  if (Platform.OS === 'ios' && asset.uri.startsWith('ph://')) {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    resolvedUri = info.localUri ?? asset.uri;
  }

  return {
    id: asset.id,
    uri: resolvedUri,
    mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

async function resolveAssetForGrid(asset: MediaLibrary.Asset): Promise<PickerAsset> {
  let resolvedUri = asset.uri;

  if (Platform.OS === 'ios' && asset.uri.startsWith('ph://')) {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id);
    resolvedUri = info.localUri ?? asset.uri;
  }

  return {
    id: asset.id,
    uri: resolvedUri,
    mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

export default function PostMediaPickerScreen() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const [albums, setAlbums] = useState<PickerAlbum[]>([]);
  const [rawAssets, setRawAssets] = useState<RawMediaAsset[]>([]);
  const [assets, setAssets] = useState<PickerAsset[]>([]);

  const [activeBucket, setActiveBucket] = useState<MediaBucketKey>('recent');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeAlbumTitle, setActiveAlbumTitle] = useState('최근 항목');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [albumsSheetOpen, setAlbumsSheetOpen] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);

  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  const endCursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  /**
   * IOS 일 경우 모든 앨범 객체의 URI를
   *  */
  const loadInitialGridAssets = useCallback(
    async (resultAssets: MediaLibrary.Asset[], reset: boolean) => {
      const firstChunk = resultAssets.slice(0, INITIAL_RESOLVE_COUNT);
      const restChunk = resultAssets.slice(INITIAL_RESOLVE_COUNT);

      const resolvedFirstChunk = await Promise.all(firstChunk.map(resolveAssetForGrid));

      setRawAssets((prev) => (reset ? resultAssets : [...prev, ...resultAssets]));
      setAssets((prev) => (reset ? resolvedFirstChunk : [...prev, ...resolvedFirstChunk]));

      if (restChunk.length > 0) {
        setTimeout(async () => {
          const resolvedRest = await Promise.all(restChunk.map(resolveAssetForGrid));

          setAssets((prev) => [...prev, ...resolvedRest]);
        }, 0);
      }
    },
    [],
  );

  /**
   * 미디어 라이브러리 권한 요청 함수
   * - 현재 권한 상태를 먼저 확인
   * - 없으면 photo / video 권한을 다시 요청
   * - 어떤 경로에서 호출됐는지 source 로그를 남김
   */
  const requestPermission = useCallback(async (source: string) => {
    try {
      const current = await MediaLibrary.getPermissionsAsync();

      if (current.granted) {
        setPermissionGranted(true);
        return true;
      }

      const next = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);

      setPermissionGranted(next.granted);
      return next.granted;
    } catch (error) {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  /**
   * 사진첩 목록 로드
   * - 권한이 없으면 바로 차단
   * - 어떤 경로에서 호출됐는지 source 로그를 남김
   */
  const loadAlbums = useCallback(async (source: string) => {
    try {
      const permission = await MediaLibrary.getPermissionsAsync();

      if (!permission.granted) {
        return [];
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
      return [];
    }
  }, []);

  /**
   * 에셋 로드
   * - 권한 상태를 다시 확인
   * - 중복 호출 방지
   * - 어떤 경로에서 호출됐는지 source 로그를 남김
   */
  const loadAssets = useCallback(
    async ({
      reset,
      albumId,
      bucket,
      source,
    }: {
      reset: boolean;
      albumId: string | null;
      bucket: MediaBucketKey;
      source: string;
    }) => {
      const permission = await MediaLibrary.getPermissionsAsync();

      if (!permission.granted) {
        return null;
      }

      if (loadingRef.current) {
        return null;
      }

      loadingRef.current = true;
      setLoading(true);

      console.log(`[MediaPicker][loadAssets:${source}] page info`, {
        reset,
        requestedAfter: reset ? undefined : (endCursorRef.current ?? undefined),
      });

      try {
        const result = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: reset ? undefined : (endCursorRef.current ?? undefined),
          album: bucket === 'albums' ? (albumId ?? undefined) : undefined,
          mediaType: bucket === 'videos' ? ['video'] : ['photo', 'video'],
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });

        console.log(`[MediaPicker][loadAssets:${source}] result page`, {
          count: result.assets.length,
          endCursor: result.endCursor,
          hasNextPage: result.hasNextPage,
          totalCount: result.totalCount,
        });

        await loadInitialGridAssets(result.assets, reset);

        endCursorRef.current = result.endCursor ?? null;
        setHasNextPage(result.hasNextPage);
      } catch (error) {
        return null;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  /**
   * 최초 진입 시 부트스트랩
   * - 권한 요청
   * - 앨범 로드
   * - 최근 항목 로드
   */
  const bootstrap = useCallback(async () => {
    setBootstrapping(true);

    try {
      const granted = await requestPermission('bootstrap');

      if (!granted) {
        return;
      }

      await loadAlbums('bootstrap');

      setActiveBucket('recent');
      setActiveAlbumId(null);
      setActiveAlbumTitle('최근 항목');
      setAssets([]);
      setSelectedIds([]);
      endCursorRef.current = null;
      setHasNextPage(true);

      await loadAssets({
        reset: true,
        albumId: null,
        bucket: 'recent',
        source: 'bootstrap',
      });
    } finally {
      setBootstrapping(false);
    }
  }, [loadAlbums, loadAssets, requestPermission]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  /**
   * 상단 드롭다운 메뉴 선택
   */
  const applyBucket = useCallback(
    async (bucket: MediaBucketKey) => {
      setMenuOpen(false);
      setSelectedIds([]);
      setAssets([]);
      endCursorRef.current = null;
      setHasNextPage(true);

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
        source: `applyBucket:${bucket}`,
      });
    },
    [loadAssets],
  );

  /**
   * 모든 사진첩에서 특정 사진첩 선택
   */
  const applyAlbum = useCallback(
    async (album: PickerAlbum) => {
      setAlbumsSheetOpen(false);
      setSelectedIds([]);
      setAssets([]);
      endCursorRef.current = null;
      setHasNextPage(true);

      setActiveBucket('albums');
      setActiveAlbumId(album.id);
      setActiveAlbumTitle(album.title);

      await loadAssets({
        reset: true,
        albumId: album.id,
        bucket: 'albums',
        source: `applyAlbum:${album.id}`,
      });
    },
    [loadAssets],
  );

  const previewHeight = useSharedValue(PREVIEW_MAX_HEIGHT);
  const dragStartHeight = useSharedValue(PREVIEW_MAX_HEIGHT);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const isPreviewCollapsed = useSharedValue(false);

  const listNativeGesture = Gesture.Native();

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(listNativeGesture)
    .activeOffsetY([-3, 3])
    .onBegin(() => {
      dragStartHeight.value = previewHeight.value;
    })
    .onUpdate((event) => {
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
      const midpoint = (PREVIEW_MAX_HEIGHT - PREVIEW_MIN_HEIGHT) * 0.5;
      const shouldCollapse = previewHeight.value < midpoint;

      previewHeight.value = withTiming(shouldCollapse ? PREVIEW_MIN_HEIGHT : PREVIEW_MAX_HEIGHT, {
        duration: 220,
      });
    });

  const previewAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: previewHeight.value,
      opacity: previewHeight.value / PREVIEW_MAX_HEIGHT,
    };
  });

  const toggleAsset = useCallback(
    (assetId: string) => {
      if (!multiSelectEnabled) {
        setSelectedIds([assetId]);
        return;
      }

      setSelectedIds((prev) => {
        const exists = prev.includes(assetId);
        if (exists) return prev.filter((id) => id !== assetId);
        return [...prev, assetId];
      });
    },
    [multiSelectEnabled],
  );

  const onToggleMultiSelect = useCallback(() => {
    setMultiSelectEnabled((prev) => {
      const next = !prev;
      if (!next && selectedIds.length > 1) {
        setSelectedIds((current) => (current.length > 0 ? [current[0]] : []));
      }
      return next;
    });
  }, [selectedIds.length]);

  // const onPressNext = useCallback(() => {
  //   if (selectedAssets.length === 0) return;

  //   router.push({
  //     pathname: '/post/new/editor',
  //     params: {
  //       assets: JSON.stringify(selectedAssets),
  //     },
  //   });
  // }, [selectedAssets]);

  const AssetCell = React.memo(function AssetCell({
    item,
    isSelected,
    selectedIndex,
    multiSelectEnabled,
    onPress,
  }: {
    item: PickerAsset;
    isSelected: boolean;
    selectedIndex: number;
    multiSelectEnabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable style={styles.cell} onPress={onPress}>
        <Image source={{ uri: item.uri }} style={styles.cellImage} resizeMode="cover" />

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

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedIds.forEach((id, index) => {
      map.set(id, index);
    });
    return map;
  }, [selectedIds]);

  const renderAsset = useCallback(
    ({ item }: { item: PickerAsset }) => {
      const selectedIndex = selectedIndexMap.get(item.id) ?? -1;
      const isSelected = selectedIdSet.has(item.id);

      return (
        <AssetCell
          item={item}
          isSelected={isSelected}
          selectedIndex={selectedIndex}
          multiSelectEnabled={multiSelectEnabled}
          onPress={() => toggleAsset(item.id)}
        />
      );
    },
    [multiSelectEnabled, selectedIdSet, selectedIndexMap, toggleAsset],
  );

  const selectedAssets = useMemo(() => {
    const assetMap = new Map(assets.map((item) => [item.id, item]));

    return selectedIds
      .map((id) => assetMap.get(id))
      .filter((item): item is PickerAsset => Boolean(item));
  }, [assets, selectedIds]);

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
          disabled={selectedAssets.length === 0}
        >
          <AppText
            style={[styles.nextText, selectedAssets.length === 0 && styles.nextTextDisabled]}
          >
            다음
          </AppText>
        </Pressable>
      </View>

      <Animated.View style={[styles.previewArea, previewAnimatedStyle]}>
        {selectedIds.length <= 0 || null ? (
          <View style={styles.previewPlaceholder}>
            <AppText style={styles.previewPlaceholderText}>선택한 이미지 미리보기</AppText>
          </View>
        ) : (
          selectedAssets.map((asset) => (
            <Image
              id={asset.uri}
              source={{ uri: asset.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ))
        )}
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
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

          <GestureDetector gesture={listNativeGesture}>
            <Animated.FlatList
              data={assets}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={renderAsset}
              style={{ flex: 1 }}
              initialNumToRender={24}
              maxToRenderPerBatch={24}
              windowSize={7}
              updateCellsBatchingPeriod={16}
              removeClippedSubviews
              onEndReachedThreshold={0.3}
              onEndReached={() => {
                if (!hasNextPage || loading || loadingMoreRef.current) return;

                loadingMoreRef.current = true;

                loadAssets({
                  reset: false,
                  albumId: activeAlbumId,
                  bucket: activeBucket,
                  source: 'onEndReached',
                }).finally(() => {
                  loadingMoreRef.current = false;
                });
              }}
            />
          </GestureDetector>
        </View>
      </GestureDetector>

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
  previewArea: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#111',
  },

  previewImage: {
    width: '100%',
    height: '100%',
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
  galleryArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  dragHandle: {
    alignSelf: 'center',
    marginTop: 8,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#bbb',
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
    top: 108,
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
    backgroundColor: '#666',
  },
  cellImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ececec',
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
