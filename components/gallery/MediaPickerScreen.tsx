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

/* 화면 너비를 기준으로 갤러리의 셀 크기를 계산합니다.
 * columns 은 한 row 에 4개입니다.
 * 따라서, 셀의 너비는 화면 너비의 1/4 입니다.
 * */
const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 4;
const CELL_SIZE = Math.floor(SCREEN_WIDTH / NUM_COLUMNS);

/* 선택한 사진의 미리보기 영역이 가질 수 있는 최대 및 최소 높이입니다.
 * Reanimated 가 이 범위 안에서 높이를 변경합니다.
 *
 * 따라서, 최소 높이는 별도 지정하지 않고 최대 높이만을 지정합니다.
 * */
const PREVIEW_MAX_HEIGHT = SCREEN_WIDTH;
const PREVIEW_MIN_HEIGHT = 0;

/* PhotoKit 에서 한 번에 가져올 asset 메타데이터의 개수입니다.
 * 주의 : 현재 구현은 가져온 모든 asset 의 썸네일도 요청합니다.
 * 따라서, 1000이라는 값은 썸네일 생성 부하에도 영향을 줍니다.
 * */
const INITIAL_LOAD_COUNT = 1000;
const PAGINATION_LOAD_COUNT = 1000;

/* 최대 선택 개수를 10개로 통제합니다. */
const MAX_SELECTION_COUNT = 10;

/* 사용자가 선택할 수 있는 시스템 갤러리의 분류입니다.
 * key는 내부 식별자이고 label 은 화면에 표시하는 문자열입니다.
 * */
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

/** 갤러리 화면에서 애니메이션을 적용할 수 있도록 react-native-reanimated 의 createAnimatedComponent 를 사용해서 flat list 애니메이션을 선언합니다. */
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<PickerAsset>);

/**
 * Native 모듈에서 반환한 asset 메타데이터를
 * React native 화면에서 사용하는 PickerAsset 타입으로 변환합니다.
 *
 * 여기서는 실제 썸네일 파일을 만들지는 않기에 thumbnailUri 가 null 입니다.
 * thumbnailUri 는 비동기 요청이 완료되면 갱신됩니다.
 *
 * ph:// URI 는 원본 PhotoKit asset 을 식별하기 위한 값이며,
 * 실제 셀 이미지에서 사용하는 thumbnail Uri 와 역할이 다릅니다.
 *
 * */
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

/**
 * 갤러리의 사진 또는 동영상 하나를 표시하는 셀입니다.
 *
 * React.memo는 props가 변경되지 않은 셀의 불필요한 재렌더링을
 * 줄이기 위한 장치이며, props 참조가 변경되면 다시 렌더링될 수 있습니다.
 *
 * 이 컴포넌트는 이미지를 직접 요청하지 않으며, 상위 컴포넌트가 전달한 thumbnailUri 만 화면에 표시합니다.
 */
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
      {/* 썸네일 URI가 준비되면 이미지를 표시하고, 아니면 placeholder를 표시한다. */}
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

      {/* 동영상인 경우 셀 왼쪽 아래에 VIDEO 배지를 표시한다. */}
      {item.mediaType === 'video' ? (
        <View style={styles.videoBadge}>
          <AppText style={styles.videoBadgeText}>VIDEO</AppText>
        </View>
      ) : null}

      {/* 선택된 사진에는 선택 순서 또는 체크 표시를 보여준다. */}
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
  // 사진 접근 권한 state null 상태는 아직 권한 확인이 끝나지 않음을 의미
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Native에서 가져온 앨범 목록.
  const [albums, setAlbums] = useState<NativeAlbum[]>([]);

  /**
   * Zustand에서 갤러리의 공유 상태를 구독합니다.
   *
   * useState와 달리 화면이 사라졌다가 다시 나타나더라도
   * store가 유지되는 동안 기존 데이터를 재사용할 수 있습니다.
   *
   * assets에는 썸네일 URI를 포함한 현재 앨범의 asset 목록이 들어갑니다.
   *
   * 다른 상태관리 라이브러리보다 zustand 를 우선적으로 채택한 이유는
   * 단순함입니다.
   *
   * 직관적이며, 단순하여 빠르게 개발 가능하다는 점이 주요 채택 사유입니다.
   */
  const assets = usePostGalleryStore((state) => state.assets);
  const activeAlbumId = usePostGalleryStore((state) => state.activeAlbumId);
  const activeAlbumTitle = usePostGalleryStore((state) => state.activeAlbumTitle);
  const selectedIds = usePostGalleryStore((state) => state.selectedIds);
  const multiSelectEnabled = usePostGalleryStore((state) => state.multiSelectEnabled);
  const hasNextPage = usePostGalleryStore((state) => state.hasNextPage);
  const activePreviewId = usePostGalleryStore((state) => state.activePreviewId);
  const endCursor = usePostGalleryStore((state) => state.endCursor);

  // Zustand 상태를 변경하는 action들.
  const setAssets = usePostGalleryStore((state) => state.setAssets);
  const appendAssets = usePostGalleryStore((state) => state.appendAssets);
  const setGalleryMeta = usePostGalleryStore((state) => state.setGalleryMeta);
  const setSelectedIds = usePostGalleryStore((state) => state.setSelectedIds);
  const removeSelected = usePostGalleryStore((state) => state.removeSelected);
  const clearSelection = usePostGalleryStore((state) => state.clearSelection);
  const setSelection = usePostGalleryStore((state) => state.setSelection);
  const updateAssetThumbnails = usePostGalleryStore((state) => state.updateAssetThumbnails);

  // 앨범 드롭다운 및 전체 앨범 선택 모달의 표시 여부.
  const [menuOpen, setMenuOpen] = useState(false);
  const [albumsSheetOpen, setAlbumsSheetOpen] = useState(false);

  // 초기 권한 확인 및 앨범 준비 상태.
  const [bootstrapping, setBootstrapping] = useState(true);

  // asset 메타데이터 요청이 진행 중인지 나타낸다.
  const [loading, setLoading] = useState(false);

  // Native가 반환한 시스템 앨범의 실제 식별자를 보관한다.
  const [systemAlbumIds, setSystemAlbumIds] = useState<{
    recent: string | null;
    favorites: string | null;
    videos: string | null;
  }>({
    recent: null,
    favorites: null,
    videos: null,
  });

  /**
   * useRef는 값을 변경해도 React 렌더링을 발생시키지 않습니다.
   *
   * endCursorRef:
   *   다음 페이지 요청에 사용할 cursor.
   *
   * loadingRef:
   *   같은 시점에 여러 getAssetsInAlbum 요청이 시작되는 것을 방지한다.
   *
   * loadingMoreRef:
   *   onEndReached가 짧은 시간에 반복 호출되는 것을 방지한다.
   *
   * loading과 loadingRef는 그 역할이 다릅니다.
   * loading은 UI 표시용이고 loadingRef는 즉시 확인하는 동시 실행 방지용으로 사용됩니다.
   */
  const endCursorRef = useRef<string | null>(null);

  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  /**
   * Reanimated의 shared value.
   *
   * 일반 React state와 달리 애니메이션 및 gesture 처리에서 사용하며,
   * 매 프레임마다 React 컴포넌트를 렌더링하지 않고 값을 변경할 수 있다.
   */
  const previewHeight = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // React의 선택 개수를 Reanimated shared value에 동기화한다.
  const selectedCount = useSharedValue(0);

  // 기존 store에 asset과 앨범 ID가 있으면 복원 가능한 세션으로 판단한다.
  const hasRestorableSession = assets.length > 0 && activeAlbumId != null;

  /**
   * iOS 사진 라이브러리 접근 권한을 확인한다.
   *
   * 이미 전체 또는 제한된 접근 권한이 있으면 추가 요청 없이 성공한다.
   * 권한이 없다면 시스템 권한 요청 화면을 호출한다.
   *
   * useCallback([])은 이 함수의 참조를 렌더링 사이에 유지한다.
   */
  const requestPermission = useCallback(async () => {
    try {
      // 권한은 expo 의 media library 를 통해 구현합니다.
      const current = await MediaLibrary.getPermissionsAsync();

      // 제한된 권한 부여, 승인 등을 클릭할 시 권한을 true 로 전환합니다.
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

  /**
   * Native 모듈에서 앨범 목록을 가져온다.
   *
   * 앨범 목록을 UI state에 저장하고,
   * recent/favorites/videos에 해당하는 실제 앨범 ID를 별도로 추출한다.
   *
   * 이 함수는 앨범의 사진을 가져오지는 않는다.
   */
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
  /**
   * 전달받은 asset ID들의 썸네일을 Native에 요청한다.
   *
   * 1. startPreloading:
   *    PhotoKit의 이미지 캐시를 미리 준비하도록 요청한다.
   *
   * 2. getThumbnailBatch:
   *    실제 썸네일 URI를 반환받는다.
   *
   * 3. updateAssetThumbnails:
   *    반환된 URI를 Zustand의 해당 asset에 반영한다.
   *
   * 주의:
   * 현재는 전달받은 모든 ID를 한 번에 batch 요청한다.
   * 화면에 보이는 asset만 선별하거나 요청 개수를 제한하지 않는다.
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
        // 캐시 준비 완료를 기다리지 않고 다음 작업을 진행한다.
        // void는 Promise를 의도적으로 await하지 않는다는 표현이다.
        void JpMediaThumbnails.startPreloading(assetIds, options).catch((error) => {
          console.error('[startPreloading][failed]', error);
        });

        // Native에서 썸네일 결과를 받을 때까지 이 함수의 실행을 기다린다.
        const results = await JpMediaThumbnails.getThumbnailBatch(assetIds, options);

        const successCount = Object.values(results).filter((uri) => Boolean(uri)).length;

        console.log('[loadThumbnails:done]', assetIds.length, successCount);

        // URI가 존재하는 결과만 Zustand 갱신 형식으로 변환한다.
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

        // Store의 thumbnailUri가 갱신되면 해당 asset을 사용하는 UI가 갱신된다.
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
  /**
   * 현재 앨범에서 asset 메타데이터 한 페이지를 가져온다.
   *
   * reset=true:
   *   기존 asset 목록을 새 결과로 교체한다.
   *
   * reset=false:
   *   기존 목록 뒤에 새 결과를 추가한다.
   *
   * first:
   *   Native에 요청할 최대 asset 개수.
   *
   * 이 함수는 메타데이터 로딩과 썸네일 로딩을 분리한다.
   * 썸네일 생성이 끝날 때까지 pagination을 기다리지 않는다.
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
      // 앨범이 없거나 이미 asset 요청이 진행 중이면 시작하지 않는다.
      if (!albumId) {
        return null;
      }

      if (loadingRef.current) {
        return null;
      }

      loadingRef.current = true;
      setLoading(true);

      try {
        // reset 요청은 첫 페이지이므로 cursor를 전달하지 않는다.
        const result = await JpMediaThumbnails.getAssetsInAlbum(
          albumId,
          first,
          reset ? null : endCursorRef.current,
        );

        console.log('[loadAssets]', result.assets.length);

        // Native 모델을 화면용 모델로 변환한다.
        const mapped = result.assets.map(toPickerAssetFromNative);

        if (reset) {
          setAssets(mapped);
        } else {
          appendAssets(mapped);
        }

        // 현재 페이지에서 반환된 asset들만 썸네일 요청 대상으로 삼는다.
        // TODO asset이 썸네일을 그냥 같이 보관하면 안되나
        const assetIds = result.assets.map((asset) => asset.id);

        // Intentionally not awaited.
        // Asset pagination should not wait for
        // JPEG/file URI generation to finish.
        // 의도적으로 await하지 않는다.
        // 메타데이터 요청 완료와 썸네일 생성 완료를 분리하기 위함이다.
        void loadThumbnails(assetIds);

        // 다음 페이지를 요청할 때 사용할 cursor를 갱신한다.
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
        // 요청 성공/실패와 관계없이 로딩 잠금을 해제한다.
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
  /**
   * Zustand의 cursor가 변경되면 ref에도 반영한다.
   *
   * Store와 ref가 같은 정보를 보관하므로 두 값의 동기화가 중요하다.
   * TODO : 그러면 하나만 쓰면 되는거 아닌가
   */
  useEffect(() => {
    endCursorRef.current = endCursor;
  }, [endCursor]);

  /**
   * 사용자가 선택한 시스템 분류를 실제 Native 앨범 ID로 변환한다.
   *
   * 'albums'는 사용자가 선택한 일반 앨범 ID를 사용한다.
   *
   * TODO : 이걸 굳이 변환할 필요가 있나 싶네 그냥 그대로 쓰면 되는데
   */
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

  /**
   * 갤러리 세션의 asset 목록과 선택 상태를 초기화한다.
   *
   * 앨범을 변경할 때 이전 앨범의 사진과 pagination 정보를
   * 다음 앨범에 섞지 않기 위해 호출한다.
   */
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

  // 현재는 resetPickerSession을 그대로 호출하는 래퍼 함수다.
  const resetAssetState = useCallback(() => {
    resetPickerSession();
  }, [resetPickerSession]);

  /**
   * 화면 초기화의 시작점.
   *
   * 1. 사진 접근 권한을 확인한다.
   * 2. 앨범 목록을 가져온다.
   * 3. 복원 가능한 세션이 없으면 최근 항목을 초기 상태로 설정한다.
   *
   * 실제 최근 항목 asset 로딩은 아래 initializeRecent effect가 담당한다.
   */
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
  /**
   * 화면이 unmount될 때 PhotoKit preloading을 중단한다.
   *
   * dependency가 []이므로 일반적인 dependency 변경에 의한
   * cleanup 재실행은 발생하지 않는다.
   *
   * bootstrap을 cleanup에서 실행하지 않는 것이 중요하다.
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
  /**
   * 복원 가능한 세션이 없다면 bootstrap을 실행한다.
   *
   * 주의:
   * bootstrap은 hasRestorableSession에 의존하므로
   * 이 값이 변경되면 함수 참조와 effect 실행 조건도 달라진다.
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
  /**
   * 최근 항목 앨범 ID가 준비되면 첫 페이지를 가져온다.
   *
   * bootstrap에서 loadAlbums를 호출하고,
   * loadAlbums가 systemAlbumIds를 설정하면 이 effect가 실행될 수 있다.
   *
   * 주의:
   * 이 effect에는 별도의 요청 취소나 실행 세대 확인 로직이 없다.
   * 따라서 중복 초기화 및 비동기 경쟁 상태 가능성은 별도 검토가 필요하다.
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

  /**
   * 선택된 asset 목록에 맞춰 활성 미리보기 ID를 결정한다.
   *
   * 선택이 없으면 미리보기를 비운다.
   * 현재 활성 asset이 여전히 선택되어 있으면 유지한다.
   * 그렇지 않으면 마지막으로 선택된 asset을 활성화한다.
   */
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

  /**
   * asset ID로 asset을 빠르게 찾기 위한 Map.
   *
   * 배열에서 매번 find를 호출하는 대신 ID를 키로 사용한다.
   * assets가 변경될 때만 Map을 다시 생성한다.
   */
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  // 선택 순서를 유지하면서, 실제 asset 객체 목록을 만듭니다.
  const selectedAssets = useMemo(
    () =>
      selectedIds
        .map((id) => assetMap.get(id))
        .filter((asset): asset is PickerAsset => Boolean(asset)),
    [assetMap, selectedIds],
  );

  // 현재 큰 미리보기 영역에 표시할 asset을 찾는다.
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

  /**
   * 선택된 사진이 있으면 미리보기 영역을 펼치고,
   * 선택이 없으면 애니메이션으로 접는다.
   */
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

  /**
   * FlatList의 스크롤 이벤트를 처리한다.
   *
   * 스크롤 방향에 따라 선택 사진 미리보기 높이를 변경한다.
   * 아래로 스크롤하면 접고, 위로 스크롤하면 펼친다.
   *
   * onEndDrag/onMomentumEnd에서는 현재 높이를 기준으로
   * 완전히 펼칠지 접을지 결정한다.
   */
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

  /**
   * 미리보기 영역을 손가락으로 드래그할 때 사용하는 Pan gesture.
   *
   * FlatList 스크롤과 동시에 인식할 수 있도록 설정한다.
   * 드래그 시작 시 높이를 기억하고, 이동 거리만큼 높이를 변경한다.
   *
   * 현재 리스트가 최상단인지, 드래그 방향이 무엇인지에 따라
   * 미리보기 패널을 움직일지 결정한다.
   */
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

  /**
   * 시스템 분류(최근 항목, 동영상, 즐겨찾기)를 선택했을 때 실행한다.
   *
   * 기존 PhotoKit 캐시 준비를 중단하고,
   * 이전 앨범 상태를 초기화한 다음,
   * 새 앨범의 첫 페이지를 가져온다.
   *
   * 'albums'는 즉시 앨범을 변경하지 않고 선택 모달을 연다.
   */
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

  /**
   * 사용자가 직접 만든 앨범을 선택했을 때 실행한다.
   *
   * applyBucket과 비슷하지만, 선택한 album 객체의
   * id와 title을 그대로 사용한다.
   */
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

  /**
   * 사진 선택 상태를 변경한다.
   *
   * 단일 선택 모드에서는 선택 목록을 해당 ID 하나로 교체한다.
   * 다중 선택 모드에서는 이미 선택된 ID를 제거하거나 새 ID를 추가한다.
   */
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

      if (selectedIds.length === MAX_SELECTION_COUNT) {
        alert();
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
