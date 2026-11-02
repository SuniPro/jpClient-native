// useKeyboardToolbarPosition.ts
import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Keyboard, LayoutChangeEvent, Platform, useWindowDimensions, View } from 'react-native';

type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const EMPTY_LAYOUT: LayoutRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

export function useKeyboardToolbarPosition(parentsRef: RefObject<View | null>) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [rootWindowFrame, setRootWindowFrame] = useState<LayoutRect>(EMPTY_LAYOUT);
  const [rootLayout, setRootLayout] = useState<LayoutRect>(EMPTY_LAYOUT);
  const [overlayLayout, setOverlayLayout] = useState<LayoutRect>(EMPTY_LAYOUT);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardTop = useMemo(() => screenHeight - keyboardHeight, [screenHeight, keyboardHeight]);

  const toolbarBottom = useMemo(() => {
    if (!isKeyboardVisible) return null;
    if (rootWindowFrame.height <= 0) return null;

    return rootWindowFrame.y + rootWindowFrame.height - keyboardTop;
  }, [isKeyboardVisible, rootWindowFrame.y, rootWindowFrame.height, keyboardTop]);

  const isReady = isKeyboardVisible && rootLayout.height > 0 && toolbarBottom !== null;

  const handleRootLayout = (e: LayoutChangeEvent) => {
    setRootLayout(e.nativeEvent.layout);
  };

  const handleOverlayLayout = (e: LayoutChangeEvent) => {
    setOverlayLayout(e.nativeEvent.layout);
  };

  const measureRootInWindow = useCallback(() => {
    parentsRef.current?.measureInWindow((x, y, width, height) => {
      const frame = { x, y, width, height };
      setRootWindowFrame(frame);
    });
  }, [parentsRef]);

  useLayoutEffect(() => {
    measureRootInWindow();
  }, [measureRootInWindow, keyboardHeight]);

  return {
    screenWidth,
    screenHeight,

    isKeyboardVisible,
    keyboardHeight,
    keyboardTop,

    rootLayout,
    overlayLayout,

    toolbarBottom,
    isReady,

    handleRootLayout,
    handleOverlayLayout,
  };
}

export function useKeyboardFrame() {
  const { height: windowHeight } = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState(windowHeight);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      setKeyboardTop(windowHeight - height);
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardTop(windowHeight);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [windowHeight]);

  return {
    isKeyboardVisible,
    keyboardHeight,
    keyboardTop,
  };
}
