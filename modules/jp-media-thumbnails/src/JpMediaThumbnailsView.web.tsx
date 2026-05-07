import * as React from 'react';

import { JpMediaThumbnailsViewProps } from './JpMediaThumbnails.types';

export default function JpMediaThumbnailsView(props: JpMediaThumbnailsViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
