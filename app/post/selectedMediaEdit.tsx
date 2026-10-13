import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { CardSlide } from '@/components/ui/slide/CardSlide/CardSlide';
import { usePostGalleryStore } from '@/stores/post-gallery.store';
import { useEffect, useMemo, useState } from 'react';
import { AddLayerModal } from '@/components/feed/edit/post/AddLayerModal';
import Button from '@/components/ui/button/Button';
import { ArrowRight, HighWriter, LocateFixed, Return, Thermometer } from '@/assets/icons/icon';
import { useNavigation } from 'expo-router';
import { EditedMediaDraft, EditedMediaDraftMap } from '@/types/app/post/type';
import { PickerAsset } from '@/components/gallery/types';
import { CardProps } from '@/components/ui/slide/CardSlide/type';

const CreateEditedMediaDraftMap = (assets: PickerAsset[]): EditedMediaDraftMap =>
  Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      {
        asset: asset,
        previewUri: asset.thumbnailUri ?? asset.uri,
        textLayers: [],
        stickerLayers: [],
        filterState: 'none',
      },
    ]),
  );

export default function SelectedMediaEditScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const selectedAssets = usePostGalleryStore((state) => state.selectedAssets);

  const [editedMediaDraftMap, setEditedMediaDraftMap] = useState<EditedMediaDraftMap>(() =>
    CreateEditedMediaDraftMap(selectedAssets),
  );

  useEffect(() => {
    setEditedMediaDraftMap((prev) => {
      const next: EditedMediaDraftMap = {};

      for (const asset of selectedAssets) {
        next[asset.id] = prev[asset.id] ?? {
          asset,
          previewUri: asset.thumbnailUri ?? asset.uri,
          textLayers: [],
          stickerLayers: [],
          filterState: 'none',
        };
      }

      return next;
    });
  }, [selectedAssets]);

  const filteredAssets: CardProps[] = selectedAssets.map((asset) => {
    const editedDraft = editedMediaDraftMap[asset.id];

    return {
      id: asset.id,
      image: editedDraft.asset.uri,
      textLayers: editedDraft.textLayers,
    };
  });

  const [selectedMediaId, setSelectedMediaId] = useState<string>(filteredAssets[0].id);

  useEffect(() => {
    console.log('[editedMediaDraftMap] id = ', editedMediaDraftMap[selectedMediaId]);
    console.log(
      '[editedMediaDraftMap] textLayers = ',
      editedMediaDraftMap[selectedMediaId].textLayers,
    );

    console.log('[selectedMediaId]', selectedMediaId);
  }, [editedMediaDraftMap, selectedMediaId]);

  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorModalInitialMode, setEditorModalInitialMode] = useState<
    'text' | 'sticker' | 'filter'
  >('text');

  const activeEditAsset = useMemo(
    () => selectedAssets.find((asset) => asset.id === selectedMediaId) ?? null,
    [selectedAssets, selectedMediaId],
  );

  const activeEditedDraft = useMemo(
    () => editedMediaDraftMap[selectedMediaId] ?? null,
    [editedMediaDraftMap, selectedMediaId],
  );

  const openTextEditor = () => {
    setEditorModalInitialMode('text');
    setSelectedMediaId(selectedMediaId);
    setEditorModalOpen(true);
  };

  const openStickerEditor = () => {
    setEditorModalInitialMode('sticker');
    setEditorModalOpen(true);
  };

  const openFilterEditor = () => {
    setEditorModalInitialMode('filter');
    setEditorModalOpen(true);
  };

  const onSave = (id: string, draft: EditedMediaDraft) => {
    setEditedMediaDraftMap((prev) => ({
      ...prev,
      [id]: draft,
    }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.textPrimary }]}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
          paddingHorizontal: 20,
          // marginBottom: 30,
        }}
      >
        <Pressable onPress={navigation.goBack}>
          <Return width={24} height={24} color="white" />
        </Pressable>
        <Pressable>
          <ArrowRight width={24} height={24} color="white" />
        </Pressable>
      </View>
      <CardSlide
        imageAssets={filteredAssets}
        onSelectIndex={(index) => {
          const selectedAsset = filteredAssets[index];

          setSelectedMediaId(selectedAsset.id);
        }}
      />
      <AddLayerModal
        visible={editorModalOpen}
        draft={editedMediaDraftMap[selectedMediaId]}
        editorModalInitialMode={editorModalInitialMode}
        onSave={onSave}
        onClose={() => setEditorModalOpen(false)}
      />
      <View style={styles.feature}>
        <Button
          label={<LocateFixed width={20} height={20} color="white" />}
          size="xl"
          fullWidth={false}
          variant="solid"
          color="secondary"
          style={{ backgroundColor: '#2E303300' }}
        />
        <Button
          onPress={openTextEditor}
          label={<HighWriter width={20} height={20} color="white" />}
          size="xl"
          fullWidth={false}
          variant="solid"
          color="secondary"
          style={{ backgroundColor: '#2E303300' }}
        />
        <Button
          label={<Thermometer width={20} height={20} color="white" />}
          size="xl"
          fullWidth={false}
          variant="solid"
          color="secondary"
          style={{ backgroundColor: '#2E303300' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    // alignItems: 'flex-start',
    gap: 20,
    flex: 1,
  },
  feature: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: '10',
  },
});
