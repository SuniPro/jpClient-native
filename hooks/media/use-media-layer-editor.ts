import { FilterState, StickerLayerDraft, TextLayerDraft } from '@/components/feed/edit/post/types';
import { useCallback, useRef, useState } from 'react';

export type TextEditorCommands = {
  flushActiveLayer: () => void;
  startCreateTextLayer: () => void;
  resetEditor: (options?: { clearCommittedLayers?: boolean }) => void;
  startEditingTextLayer: (id: string) => void;
  moveTextLayer: (id: string, x: number, y: number) => void;
};

export const useMediaLayerEditor = () => {
  /* TextLayers Management */
  const textEditorRef = useRef<TextEditorCommands>(null);
  const [textLayers, setTextLayers] = useState<TextLayerDraft[]>([]);
  const [stickerLayers, setStickerLayers] = useState<StickerLayerDraft[]>([]);
  const [filterState, setFilterState] = useState<FilterState>('none');

  const commitLayer = useCallback((layer: TextLayerDraft) => {
    setTextLayers((prev) => {
      if (!layer.text.trim()) {
        return prev.filter((l) => l.id !== layer.id);
      }

      /*
       * TextLayer 배열과 단일 TextLayer를 받아,
       * 같은 id의 레이어가 있으면 교체하고 없으면 추가합니다.
       */
      const exists = prev.some((l) => l.id === layer.id);
      return exists ? prev.map((l) => (l.id === layer.id ? layer : l)) : [...prev, layer];
    });
  }, []);

  /* Text Editor handler */

  /**
   * 부모의 "생성" 버튼에서 호출됩니다.
   *
   * TextEditorPanel 내부 편집 draft를 먼저 flush한 뒤,
   * 새 TextLayer 생성/편집 시작을 panel에 위임합니다.
   */
  const handleCreateTextLayer = useCallback(() => {
    textEditorRef.current?.flushActiveLayer();
    textEditorRef.current?.startCreateTextLayer();
  }, []);

  const handleSelectSavedTextLayer = useCallback((id: string) => {
    textEditorRef.current?.startEditingTextLayer(id);
  }, []);

  const handleMoveSavedTextLayer = useCallback((id: string, x: number, y: number) => {
    textEditorRef.current?.moveTextLayer(id, x, y);
  }, []);

  const clearLayers = useCallback(() => {
    textEditorRef.current?.resetEditor({
      clearCommittedLayers: true,
    });

    setTextLayers([]);
    setStickerLayers([]);
    setFilterState('none');
  }, []);

  return {
    textEditorRef,
    textLayers,
    setTextLayers,
    stickerLayers,
    setStickerLayers,
    filterState,
    commitLayer,
    clearLayers,
    createTextLayer: handleCreateTextLayer,
    selectTextLayer: handleMoveSavedTextLayer,
    moveTextLayer: handleSelectSavedTextLayer,
  };
};
