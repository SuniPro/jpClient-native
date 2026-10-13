import { useEffect, useRef } from 'react';
import { Animated, PanResponder, View, Text } from 'react-native';
import { FontKey, fontList } from '@/theme/font';
import { textLayerStyle } from '@/components/feed/edit/post/textLayerEdit/styles';
import { TextLayerDraft } from '../types';

const DRAG_THRESHOLD = 8;

export type SavedTextLayerProps = {
  layer: TextLayerDraft;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

/* Helper Functions */
export const getNearestIndex = (x: number, offsets: number[]) => {
  const clampedX = Math.max(0, x);

  let nearestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  offsets.forEach((offset, index) => {
    const d = Math.abs(offset - clampedX);
    if (d < minDistance) {
      minDistance = d;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

export const getFontFamily = (fontKey: FontKey) => {
  const found = fontList.find((font) => font.key === fontKey);
  return found?.family ?? 'Pretendard';
};

export const createTextLayer = (): TextLayerDraft => ({
  id: `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  text: '',
  color: '#FFFFFF',
  align: 'center',
  fontSize: 20,
  x: 24,
  y: 160,
  fontKey: 'pretendard',
  width: 220,
  zIndex: 0,
});

export function SavedTextLayer({ layer, onSelect, onMove }: SavedTextLayerProps) {
  const pan = useRef(new Animated.ValueXY({ x: layer.x, y: layer.y })).current;
  const startRef = useRef({ x: layer.x, y: layer.y });
  const layerRef = useRef(layer);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    layerRef.current = layer;
    pan.setValue({ x: layer.x, y: layer.y });
  }, [layer, pan]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const distance = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        const currentLayer = layerRef.current;
        startRef.current = { x: currentLayer.x, y: currentLayer.y };
        pan.setOffset({ x: startRef.current.x, y: startRef.current.y });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();

        const currentLayer = layerRef.current;
        const nextX = startRef.current.x + g.dx;
        const nextY = startRef.current.y + g.dy;

        if (distance(g.dx, g.dy) < DRAG_THRESHOLD) {
          onSelectRef.current(currentLayer.id);
          return;
        }

        pan.setValue({ x: nextX, y: nextY });
        onMoveRef.current(currentLayer.id, nextX, nextY);
      },

      onPanResponderTerminate: (_, g) => {
        pan.flattenOffset();

        const currentLayer = layerRef.current;
        const nextX = startRef.current.x + g.dx;
        const nextY = startRef.current.y + g.dy;

        if (distance(g.dx, g.dy) >= DRAG_THRESHOLD) {
          pan.setValue({ x: nextX, y: nextY });
          onMoveRef.current(currentLayer.id, nextX, nextY);
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        textLayerStyle.textBox,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          backgroundColor: 'transparent',
        },
      ]}
    >
      <View style={textLayerStyle.overlayContainer}>
        <Text
          style={[
            textLayerStyle.textDisplay,
            {
              fontSize: layer.fontSize,
              color: layer.color,
              fontFamily: getFontFamily(layer.fontKey),
              textAlign: layer.align,
            },
          ]}
        >
          {layer.text}
        </Text>
      </View>
    </Animated.View>
  );
}
