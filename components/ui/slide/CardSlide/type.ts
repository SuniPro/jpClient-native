import { EditedMediaDraft } from '@/types/app/post/type';

export interface CardProps {
  id: string;
  image: string;
  textLayers?: EditedMediaDraft['textLayers'];
}
