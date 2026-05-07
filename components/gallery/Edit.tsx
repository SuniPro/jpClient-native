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
import JpMediaThumbnails from '@/modules/jp-media-thumbnails';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../Text';
import { AlbumMenuItem, MediaBucketKey, PickerAlbum, PickerAsset } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const CELL_SIZE = Math.floor(SCREEN_WIDTH / NUM_COLUMNS);

const INITIAL_LOAD_COUNT = 80;
const PAGINATION_LOAD_COUNT = 80;

const THUMBNAIL_SYNC_BATCH_SIZE = 120;

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

  const autoPagingRunningRef = useRef(false);
  const autoPagingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** assets length 와 thumbnail 들을 동기화 하기 위한 ref
   * 전체 asset 배열을 JS가 배치 단위로 순회할 때, 다음에 검사할 시작 위치를 기억하는 인덱스
   * */
  const thumbnailSyncIndexRef = useRef(0);
  /** assets length 와 thumbnail 들을 동기화 하기 위한 ref
   * running 은 현재 sync 가 동작하고 있는 지를 뜻합니다.
   * */
  const thumbnailSyncRunningRef = useRef(false);

  const thumbnailSyncStoppedRef = useRef(false);

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

  const isThumbnailSyncComplete = useCallback(() => {
    if (hasNextPage) return false;
    if (assets.length === 0) return false;

    return assets.every((item) => highThumbnailMapRef.current.has(item.id));
  }, [assets, hasNextPage]);

  const syncCachedThumbnails = useCallback(async () => {
    if (assets.length === 0) return;
    if (thumbnailSyncRunningRef.current) return;
    if (thumbnailSyncStoppedRef.current) return;

    if (isThumbnailSyncComplete()) {
      thumbnailSyncStoppedRef.current = true;
      return;
    }

    thumbnailSyncRunningRef.current = true;

    try {
      // 시작 지점은 현재까지 진행한 assets index 의 번호가 저장됩니다.
      const start = thumbnailSyncIndexRef.current;

      // 시작 지점에 @THUMBNAIL_SYNC_BATCH_SIZE 를 더한 값과 assets.length 중 최소값을 계산하여,
      // polling 이 진행 중이면, 당연히 첫번째 파라미터로 end 값이 정해집니다.
      // 만약 현재 진행중인 index 와 THUMBNAIL_SYNC_BATCH_SIZE 더한 값이 더 큰 경우 assets.lenght 의 마지막이 end로 설정됩니다.
      const end = Math.min(start + THUMBNAIL_SYNC_BATCH_SIZE, assets.length);

      // 배치 전체가 아닌 high로 끝난 항목은 건너뛰게 설계합니다.
      // 이미 high 까지 종료된 것은 polling 대상에서 제외
      const targetIds = assets
        .slice(start, end)
        // 만약 이미 high 퀄리티로 저장된 값이면 target 에서 제외합니다.
        .filter((item) => {
          return !highThumbnailMapRef.current.has(item.id);
        })
        .map((item) => item.id);

      // 이번 배치 구간에서 동기화할 대상이 없으면,
      // 현재 구간은 이미 high 반영이 끝났다고 보고 다음 구간으로 넘어갑니다.
      // 마지막 구간까지 왔다면 다시 0부터 순회합니다.
      // swift 는 비동기적으로 작업을 진행하기 때문에 미 처리된 구간을 탐색하기 위해서 0 부터 순회하는 것입니다.
      if (targetIds.length === 0) {
        if (end >= assets.length) {
          thumbnailSyncIndexRef.current = 0;
        } else {
          thumbnailSyncIndexRef.current = end;
        }
        return;
      }

      const entries = await Promise.all(
        targetIds.map(async (id) => {
          const high = await JpMediaThumbnails.getCachedThumbnail(id, {
            width: CELL_SIZE,
            height: CELL_SIZE,
            quality: 'high',
          });

          if (high) {
            // JS 쪽에서도 이 asset이 이미 high 썸네일까지 반영된 상태임을 기억합니다.
            // 이렇게 저장해두면 이후 배치 순회에서 이 id를 다시 조회하지 않아도 되어,
            // 불필요한 getCachedThumbnail 호출과 추가 연산을 줄일 수 있습니다.
            highThumbnailMapRef.current.set(id, high);
            return { id, uri: high };
          }

          const fast = await JpMediaThumbnails.getCachedThumbnail(id, {
            width: CELL_SIZE,
            height: CELL_SIZE,
            quality: 'fast',
          });

          if (fast) {
            // fast 썸네일도 JS 메모리 맵에 반영해둡니다.
            // 이후 high 가 오기 전까지 현재 상태를 빠르게 재사용할 수 있습니다.
            fastThumbnailMapRef.current.set(id, fast);
          }

          return { id, uri: fast ?? null };
        }),
      );

      patchThumbnailUris(entries);

      if (!hasNextPage && assets.length > 0) {
        const done = assets.every((item) => highThumbnailMapRef.current.has(item.id));
        if (done) {
          thumbnailSyncStoppedRef.current = true;
        }
      }

      if (end >= assets.length) {
        thumbnailSyncIndexRef.current = 0;
      } else {
        thumbnailSyncIndexRef.current = end;
      }
    } catch (error) {
      console.error(error);
    } finally {
      thumbnailSyncRunningRef.current = false;
    }
  }, [assets, patchThumbnailUris, isThumbnailSyncComplete, hasNextPage]);

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
    try {
      JpMediaThumbnails.stopPreloading();
    } catch (error) {
      // noop
    }

    endCursorRef.current = null;

    fastThumbnailMapRef.current.clear();
    highThumbnailMapRef.current.clear();

    fastThumbnailLoadingRef.current.clear();
    highThumbnailLoadingRef.current.clear();

    if (autoPagingTimerRef.current) {
      clearTimeout(autoPagingTimerRef.current);
      autoPagingTimerRef.current = null;
    }
    autoPagingRunningRef.current = false;

    thumbnailSyncIndexRef.current = 0;
    thumbnailSyncRunningRef.current = false;

    thumbnailSyncStoppedRef.current = false;

    setAssets([]);
    setSelectedIds([]);
    setHasNextPage(true);
  };

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
    if (assets.length === 0) return;

    const assetIds = assets.map((item) => item.id);

    JpMediaThumbnails.startPreloading(assetIds, {
      width: CELL_SIZE,
      height: CELL_SIZE,
      fastBatchSize: 48,
      highBatchSize: 12,
    }).catch(() => {
      // noop
    });
  }, [assets]);

  useEffect(() => {
    if (assets.length === 0) return;
    if (thumbnailSyncStoppedRef.current) return;

    syncCachedThumbnails().then();

    const interval = setInterval(() => {
      if (thumbnailSyncStoppedRef.current) return;
      syncCachedThumbnails().then();
    }, 400);

    return () => {
      clearInterval(interval);
    };
  }, [assets, syncCachedThumbnails]);

  useEffect(() => {
    return () => {
      try {
        JpMediaThumbnails.stopPreloading();
      } catch (error) {
        // noop
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
          removeClippedSubviews={false}
          onEndReachedThreshold={0.15}
          onEndReached={onEndReached}
          // getItemLayout={(_, index) => {
          //   const row = Math.floor(index / NUM_COLUMNS);
          //   return {
          //     length: CELL_SIZE,
          //     offset: CELL_SIZE * row,
          //     index,
          //   };
          // }}
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
