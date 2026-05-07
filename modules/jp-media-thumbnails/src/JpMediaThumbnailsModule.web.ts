import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './JpMediaThumbnails.types';

type JpMediaThumbnailsModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

class JpMediaThumbnailsModule extends NativeModule<JpMediaThumbnailsModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(JpMediaThumbnailsModule, 'JpMediaThumbnailsModule');
