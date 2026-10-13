import React, {
  Dispatch,
  forwardRef,
  SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useKeyboardToolbarPosition } from '@/hooks/layout/use-keyboard-frame';
import Button from '@/components/ui/button/Button';
import {
  Font,
  FontSize,
  Palette,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  Trash,
} from '@/assets/icons/icon';
import { useTheme } from '@/theme';
import { fontList } from '@/theme/font';
import { SIDE_PADDING, STRIDE } from './constants';
import { createTextLayer, getFontFamily, getNearestIndex, SavedTextLayer } from './helpers';
import { textLayerStyle } from './styles';
import Slider from '@react-native-community/slider';
import { triggerLightHaptic } from '@/components/haptic-tab';
import { ALIGN_LIST, TEXT_ALIGN_MODE, TextLayerDraft } from '../types';
import { TextEditorCommands } from '@/hooks/media/use-media-layer-editor';

export type TextEditorPanelProps = {
  textLayersState: {
    textLayers: TextLayerDraft[];
    setTextLayers: Dispatch<SetStateAction<TextLayerDraft[]>>;
  };
  commitLayer: (layer: TextLayerDraft) => void;
};

export const TextEditorPanel = forwardRef<TextEditorCommands, TextEditorPanelProps>(
  ({ commitLayer, textLayersState }, ref) => {
    const theme = useTheme();

    const inputRef = useRef<TextInput>(null);
    const rootRef = useRef<View>(null);
    const didInitRef = useRef(false);
    const activeLayerRef = useRef<TextLayerDraft | null>(null);
    const textLayersRef = useRef<TextLayerDraft[]>([]);

    const { textLayers, setTextLayers } = textLayersState;

    const [activeTextLayer, setActiveTextLayer] = useState<TextLayerDraft | null>(null);

    useEffect(() => {
      activeLayerRef.current = activeTextLayer;
    }, [activeTextLayer]);

    useEffect(() => {
      textLayersRef.current = textLayers;
    }, [textLayers]);

    const { toolbarBottom, isReady, handleRootLayout, handleOverlayLayout } =
      useKeyboardToolbarPosition(rootRef);

    const [fontSizeOpen, setFontSizeOpen] = useState<boolean>(false);
    const [fontListOpen, setFontListOpen] = useState<boolean>(false);
    const [paletteOpen, setPaletteOpen] = useState<boolean>(false);

    const toolbarHeightRef = useRef(0);
    const handleToolbarLayout = (e: LayoutChangeEvent) => {
      toolbarHeightRef.current = e.nativeEvent.layout.height;
    };

    const palette = Object.values(theme.palette.colors);
    const fontKeys = fontList.map((font) => font.key);
    const offsets = fontKeys.map((_, index) => index * STRIDE);

    const ALIGN_ICON_MAP: Record<TEXT_ALIGN_MODE, React.ReactNode> = {
      left: <TextAlignLeft width={20} height={20} color="white" />,
      center: <TextAlignCenter width={20} height={20} color="white" />,
      right: <TextAlignRight width={20} height={20} color="white" />,
    };

    const getNextAlign = (currentAlign: TEXT_ALIGN_MODE): TEXT_ALIGN_MODE => {
      const currentIndex = ALIGN_LIST.indexOf(currentAlign);
      const nextIndex = (currentIndex + 1) % ALIGN_LIST.length;
      return ALIGN_LIST[nextIndex];
    };

    const resetEditor = useCallback(
      (options?: { clearCommittedLayers?: boolean }) => {
        setActiveTextLayer(null);
        setFontListOpen(false);
        setPaletteOpen(false);

        activeLayerRef.current = null;

        Keyboard.dismiss();

        if (options?.clearCommittedLayers) {
          setTextLayers([]);
        }
      },
      [setTextLayers],
    );

    /** 텍스트 상자를 생성하거나, 선택했을 때 호출되는 함수
     *
     * 새 레이어 생성 시와 기존 레이어 선택 시 모두 사용되며,
     * 호출 후 TextInput 에 자동으로 focus 를 맞춥니다.
     * */
    const beginEditing = useCallback((layer: TextLayerDraft) => {
      setActiveTextLayer(layer);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }, []);

    const flushActiveLayer = useCallback(() => {
      const current = activeLayerRef.current;
      if (!current) return;

      commitLayer(current);
    }, [commitLayer]);

    /**
     * TextLayer를 생성하는 함수입니다.
     *
     * 현재 편집 중인 다른 레이어가 있다면 먼저 저장한 뒤,
     * 새로운 TextLayer를 생성하고 편집 모드로 진입합니다.
     */
    const startCreateTextLayer = useCallback(() => {
      setFontListOpen(false);
      const current = activeLayerRef.current;
      if (current) {
        commitLayer(current);
      }

      beginEditing(createTextLayer());
    }, [beginEditing, commitLayer]);

    useEffect(() => {
      const sub = Keyboard.addListener('keyboardDidHide', () => {
        const layer = activeLayerRef.current;
        if (!layer) return;
        commitLayer(layer);
      });

      if (!didInitRef.current) {
        didInitRef.current = true;
        startCreateTextLayer();
      }

      return () => sub.remove();
    }, [commitLayer, startCreateTextLayer]);

    /**
     * partial patch를 받아 현재 activeTextLayer draft만 업데이트합니다.
     *
     * 최종 textLayers 반영은 commitLayer / flushActiveLayer 시점에 수행됩니다.
     */
    const updateLayer = (patch: Partial<TextLayerDraft>) => {
      setActiveTextLayer((prev) => {
        if (!prev) return prev;
        return { ...prev, ...patch };
      });
    };

    /**
     * activeTextLayer에 patch를 적용한 뒤,
     * TextInput focus를 다시 보장해 키보드가 내려가지 않도록 합니다.
     */
    const applyPatchToActiveLayer = (patch: Partial<TextLayerDraft>) => {
      updateLayer(patch);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    const handleDeleteActiveLayer = () => {
      if (!activeTextLayer) return;

      setTextLayers((prev) => prev.filter((layer) => layer.id !== activeTextLayer.id));

      setActiveTextLayer(null);
      Keyboard.dismiss();

      setFontSizeOpen(false);
      setFontListOpen(false);
      setPaletteOpen(false);
    };

    const handleChangeFontSize = (value: number) => {
      setActiveTextLayer((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          fontSize: value,
        };
      });

      setTextLayers((prev) =>
        prev.map((layer) =>
          layer.id === activeTextLayer?.id
            ? {
                ...layer,
                fontSize: value,
              }
            : layer,
        ),
      );
    };

    /** TextLayer 를 선택하는 함수입니다.
     *
     * 1. 편집 중인 다른 레이어가 있다면 선택 전 최신 내용을 먼저 저장합니다.
     * 2. stable closure 를 피하기 위해 state 가 아닌 ref 에 저장된 최신 레이어를 찾습니다.
     * 3. 드래그, 탭 타이밍 상 못찾는 경우는 종료합니다.
     * 4. 선택한 레이어를 active 상태로 올리고 편집모드로 진입합니다.
     * */
    const startEditingTextLayer = useCallback(
      (id: string) => {
        setFontListOpen(false);
        const current = activeLayerRef.current;
        if (current && current.id !== id) {
          commitLayer(current);
        }

        const next = textLayersRef.current.find((layer) => layer.id === id);

        if (!next) return;

        beginEditing(next);
      },
      [beginEditing, commitLayer],
    );

    /**
     * 드래그 중인 레이어의 좌표를 받아 textLayers와 activeTextLayer에 반영합니다.
     *
     * 실제 드래그 이벤트 처리는 SavedTextLayer 내부 PanResponder에서 수행됩니다.
     */
    const moveTextLayer = useCallback(
      (id: string, x: number, y: number) => {
        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === id
              ? {
                  ...layer,
                  x,
                  y,
                }
              : layer,
          ),
        );

        setActiveTextLayer((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                x,
                y,
              }
            : prev,
        );
      },
      [setTextLayers],
    );

    useImperativeHandle(
      ref,
      () => ({
        flushActiveLayer,
        startCreateTextLayer,
        resetEditor,
        startEditingTextLayer,
        moveTextLayer,
      }),
      [flushActiveLayer, moveTextLayer, resetEditor, startCreateTextLayer, startEditingTextLayer],
    );

    /**
     * 편집 영역 바깥을 눌렀을 때 호출됩니다.
     *
     * 현재 편집 중인 레이어가 있으면 먼저 commit한 뒤 편집 모드를 종료하고,
     * active 레이어가 없으면 열려 있는 보조 UI(font list, palette)만 닫습니다.
     */
    const handleOutsidePress = () => {
      setFontSizeOpen(false);
      setFontListOpen(false);
      setPaletteOpen(false);

      if (activeLayerRef.current) {
        commitLayer(activeLayerRef.current);
        Keyboard.dismiss();
        setActiveTextLayer(null);
        return;
      }
    };

    const displayLayers = useMemo(
      () => textLayers.filter((l) => l.id !== activeTextLayer?.id),
      [textLayers, activeTextLayer?.id],
    );

    const handleChangeText = (text: string) => {
      if (fontSizeOpen) {
        setFontSizeOpen(false);
      }

      updateLayer({ text });
    };

    const fontSizeHandler = () => {
      if (fontListOpen) setFontListOpen(false);
      if (paletteOpen) setPaletteOpen(false);

      if (!fontSizeOpen) {
        const current = activeLayerRef.current;

        if (current) {
          commitLayer(current);
          Keyboard.dismiss();
        }

        setFontSizeOpen(true);
        return;
      }

      setFontSizeOpen(false);
    };

    const paletteHandler = () => {
      if (fontSizeOpen) setFontSizeOpen(false);
      if (fontListOpen) setFontListOpen(false);
      setPaletteOpen((prev) => !prev);
    };

    const fontListHandler = () => {
      if (paletteOpen) setPaletteOpen(false);
      if (fontSizeOpen) setFontSizeOpen(false);
      setFontListOpen((prev) => !prev);
    };

    const sharedTextStyle = {
      fontSize: activeTextLayer?.fontSize ?? 28,
      fontWeight: '700' as const,
      fontFamily: getFontFamily(activeTextLayer?.fontKey ?? 'pretendard'),
      textAlign: activeTextLayer?.align ?? 'left',
      lineHeight: Math.round((activeTextLayer?.fontSize ?? 28) * 1.2),
      letterSpacing: 0,
      padding: 0,
      margin: 0,
      includeFontPadding: false as const,
      textAlignVertical: 'top' as const,
    };

    return (
      <View
        ref={rootRef}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        onLayout={handleRootLayout}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleOutsidePress} />

        {displayLayers.map((layer) => (
          <SavedTextLayer
            key={layer.id}
            layer={layer}
            onSelect={startEditingTextLayer}
            onMove={moveTextLayer}
          />
        ))}

        {activeTextLayer && (
          <View
            style={[
              textLayerStyle.textBox,
              {
                left: activeTextLayer.x,
                top: activeTextLayer.y,
                backgroundColor: 'transparent',
              },
            ]}
          >
            {/* 렌더링되는 Text 박스와, 실제 입력하는 Text 박스는 구분되어야합니다. */}
            <View style={textLayerStyle.overlayContainer}>
              <Text
                style={[
                  styles.previewText,
                  sharedTextStyle,
                  {
                    color: activeTextLayer.color,
                  },
                ]}
              >
                {activeTextLayer.text || '문구 입력'}
              </Text>

              <TextInput
                ref={inputRef}
                value={activeTextLayer.text}
                onChangeText={handleChangeText}
                multiline
                autoFocus={false}
                submitBehavior="blurAndSubmit"
                selectionColor={activeTextLayer.color}
                cursorColor={activeTextLayer.color}
                underlineColorAndroid="transparent"
                style={[
                  styles.overlayInput,
                  sharedTextStyle,

                  fontSizeOpen
                    ? {
                        opacity: 0,
                      }
                    : {
                        color: 'transparent',
                      },
                ]}
              />
            </View>
          </View>
        )}

        {fontSizeOpen && !paletteOpen && !fontListOpen && activeTextLayer && (
          <View style={[styles.fontSizePopover, { bottom: toolbarHeightRef.current + 12 }]}>
            <Slider
              style={styles.verticalSlider}
              minimumValue={5}
              maximumValue={50}
              step={1}
              value={activeTextLayer.fontSize}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor="#FFFFFF"
              onValueChange={handleChangeFontSize}
            />
            <Text style={styles.fontSizeValue}>{activeTextLayer.fontSize}</Text>
          </View>
        )}
        {/*  fontSize open 시에는 keyboard 가 dismiss 상태이기 때문에, 자연스럽게 toolbar 도
         렌더링하지 않습니다.
         */}
        {!fontSizeOpen && activeTextLayer && isReady && toolbarBottom !== null && (
          <View
            pointerEvents="box-none"
            onLayout={handleOverlayLayout}
            style={[styles.keyboardOverlay, { bottom: toolbarBottom }]}
          >
            {fontListOpen && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="normal"
                snapToOffsets={offsets}
                snapToAlignment="center"
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, alignItems: 'center' }}
                onMomentumScrollEnd={(event) => {
                  const stoppedX = event.nativeEvent.contentOffset.x;
                  const index = getNearestIndex(stoppedX, offsets);
                  applyPatchToActiveLayer({ fontKey: fontKeys[index] });
                }}
              >
                <View style={styles.fontRow}>
                  {fontList.map((font) => (
                    <Button
                      key={font.key}
                      label={font.label}
                      style={[
                        { width: 130 },
                        {
                          backgroundColor:
                            activeTextLayer.fontKey === font.key ? '#ffffff' : '#00000059',
                        },
                      ]}
                      size="md"
                      textStyle={{
                        fontFamily: getFontFamily(font.key),
                        color: activeTextLayer.fontKey === font.key ? '#000000' : '#ffffff',
                        fontWeight: 'bold',
                      }}
                      variant="ghost"
                      color="secondary"
                      onPress={() => applyPatchToActiveLayer({ fontKey: font.key })}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {paletteOpen && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paletteRow}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
              >
                {palette.map((color, index) => (
                  <Pressable
                    key={`${color}-${index}`}
                    style={[styles.colorChip, { backgroundColor: color }]}
                    onPress={() => applyPatchToActiveLayer({ color })}
                  />
                ))}
              </ScrollView>
            )}

            <View style={styles.toolbar} onLayout={handleToolbarLayout}>
              <View style={{ position: 'relative', gap: 20 }}>
                <Button
                  label={<FontSize width={20} height={20} color="white" />}
                  size="xl"
                  fullWidth={false}
                  variant="extra"
                  style={{ backgroundColor: '#2E3033' }}
                  onPress={fontSizeHandler}
                  onPressIn={triggerLightHaptic}
                />
              </View>

              <Button
                label={<Font width={20} height={20} color="white" />}
                size="xl"
                fullWidth={false}
                variant="extra"
                style={{ backgroundColor: fontListOpen ? theme.colors.primary : '#2E3033' }}
                onPress={fontListHandler}
              />
              <Button
                label={<Palette width={20} height={20} color="white" />}
                size="xl"
                fullWidth={false}
                variant="extra"
                style={{ backgroundColor: paletteOpen ? theme.colors.primary : '#2E3033' }}
                onPress={paletteHandler}
              />
              <Button
                label={ALIGN_ICON_MAP[activeTextLayer.align]}
                size="xl"
                fullWidth={false}
                variant="extra"
                style={{ backgroundColor: '#2E3033' }}
                onPress={() =>
                  applyPatchToActiveLayer({ align: getNextAlign(activeTextLayer.align) })
                }
              />
              <Button
                label={<Trash width={20} height={20} color="white" />}
                size="xl"
                fullWidth={false}
                variant="extra"
                style={{ backgroundColor: '#2E3033' }}
                onPress={handleDeleteActiveLayer}
              />
            </View>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  keyboardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: 14,
    marginBottom: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  fontSizePopover: {
    position: 'absolute',
    left: '10%',
    transform: [{ translateX: -30 }],
    width: 50,
    height: '74%',
    borderRadius: 16,
    backgroundColor: '#2E303333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  verticalSlider: {
    width: '700%',
    transform: [{ rotate: '-90deg' }],
    bottom: '2%',
  },

  fontSizeValue: {
    position: 'absolute',
    bottom: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fontRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  paletteRow: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
    gap: 16,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  previewText: {
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
