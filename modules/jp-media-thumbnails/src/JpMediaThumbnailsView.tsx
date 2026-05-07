import { requireNativeView } from 'expo';
import * as React from 'react';

import { JpMediaThumbnailsViewProps } from './JpMediaThumbnails.types';

const NativeView: React.ComponentType<JpMediaThumbnailsViewProps> =
  requireNativeView('JpMediaThumbnails');

export default function JpMediaThumbnailsView(props: JpMediaThumbnailsViewProps) {
  return <NativeView {...props} />;
}
