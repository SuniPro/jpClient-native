import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextEditorPanel } from './textLayerEdit/TextEditorPanel';
import Button from '@/components/ui/button/Button';
import { Return, Save, Typography } from '@/assets/icons';
import { useMediaLayerEditor } from '@/hooks/media/use-media-layer-editor';
import { EditedMediaDraft } from '@/types/app/post/type';
import { useTheme } from '@/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const IMAGE_WIDTH = SCREEN_WIDTH * 0.95;
const IMAGE_HEIGHT = IMAGE_WIDTH * (4 / 3);

const BUTTON_COLOR = '#2E3033B3';

type AddLayerModalProps = {
  visible: boolean;
  draft: EditedMediaDraft;
  onSave: (id: string, draft: EditedMediaDraft) => void;
  onClose: () => void;
  editorModalInitialMode: 'text' | 'sticker' | 'filter';
};

export function AddLayerModal({
  visible,
  onSave,
  onClose,
  editorModalInitialMode,
  draft,
}: AddLayerModalProps) {
  const theme = useTheme();

  const cancelSheetTitle = (() => {
    switch (editorModalInitialMode) {
      case 'text':
        return '현재 수정중인 텍스트 작업이 있습니다.';
      case 'sticker':
        return '현재 수정중인 스티커 작업이 있습니다.';
      case 'filter':
        return '현재 수정중인 필터 작업이 있습니다.';
    }
  })();

  const imageSizeRef = useRef({ width: SCREEN_WIDTH, height: 0 });

  /* TextLayers Management */
  const {
    textEditorRef,
    textLayers,
    setTextLayers,
    stickerLayers,
    filterState,
    commitLayer,
    createTextLayer,
    clearLayers,
  } = useMediaLayerEditor();

  const [cancelMenuOpen, setCancelMenuOpen] = useState(false);
  const handlePressCancel = useCallback(() => {
    clearLayers();
    setCancelMenuOpen(true);
    onClose();
  }, [clearLayers, onClose]);

  // const handlePressSave = useCallback(() => {
  //   textEditorRef.current?.flushActiveLayer();
  // }, [textEditorRef]);

  const handleConfirmDiscard = useCallback(() => {
    switch (editorModalInitialMode) {
      case 'text':
        textEditorRef.current?.resetEditor({ clearCommittedLayers: true });
        break;

      case 'sticker':
        break;

      case 'filter':
        break;
    }

    setCancelMenuOpen(false);
    onClose();
  }, [editorModalInitialMode, onClose, textEditorRef]);

  const saveHandler = () => {
    const activeMediaContainLayer: EditedMediaDraft = {
      asset: draft.asset,
      previewUri: draft.previewUri,
      textLayers,
      stickerLayers,
      filterState,
    };

    onSave(draft.asset.id, activeMediaContainLayer);
    onClose();
  };

  const handlePressSave = () => {
    Alert.alert('변경사항 저장', '변경사항을 저장하시겠습니까?', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '저장',
        onPress: saveHandler,
      },
    ]);
  };

  useEffect(() => {
    console.log(textLayers);
  }, [textLayers]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View pointerEvents="box-none" style={styles.topActions}>
          <Pressable onPress={handlePressCancel} style={styles.topButton}>
            <Return width={20} height={20} color="white" />
          </Pressable>

          <Pressable style={styles.topButton} onPress={handlePressSave}>
            <Save width={20} height={20} color="white" />
          </Pressable>
        </View>
        <View style={styles.canvasContainer}>
          <View style={styles.imageFrame}>
            <View style={styles.imageCanvas}>
              <Image
                source={{ uri: draft.asset.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </View>
            <TextEditorPanel
              ref={textEditorRef}
              textLayersState={{ textLayers, setTextLayers }}
              commitLayer={commitLayer}
            />
          </View>
          {editorModalInitialMode === 'text' && (
            <View style={styles.bottomActions}>
              <Button
                label={<Typography width={18} height={18} color="white" />}
                size="xl"
                fullWidth={false}
                variant="extra"
                style={{ backgroundColor: BUTTON_COLOR }}
                onPress={createTextLayer}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerRightPlaceholder: {
    width: 32,
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  imageFrame: {
    width: '100%',
    height: '80%',
    overflow: 'hidden',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',

    // backgroundColor: '#111',
    // borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.15)',
  },
  imageCanvas: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '10%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  editButton: {},
  topButton: {
    height: 30,
    width: 30,
  },
});
