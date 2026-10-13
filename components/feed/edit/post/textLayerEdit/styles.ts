import { StyleSheet } from 'react-native';
import { SCREEN_WIDTH } from './constants';

export const textLayerStyle = StyleSheet.create({
  textBox: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overlayContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    minWidth: 220,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  textDisplay: {
    fontSize: 28,
    fontWeight: '700',
  },
});
