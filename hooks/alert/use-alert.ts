import { ReactNode, useCallback, useRef } from 'react';
import { ToastVariant, useToast } from 'heroui-native';

export const useToastAlert = (variant: ToastVariant, label: string, options: string) => {
  const { toast } = useToast();
  const isLimitToastVisibleRef = useRef(false);

  const showToast = useCallback(() => {
    if (isLimitToastVisibleRef.current) {
      return;
    }

    isLimitToastVisibleRef.current = true;

    toast.show({
      variant: variant,
      label: label,
      description: options,
      // 실제 HeroUI Native 버전에서 지원하는 종료 콜백을 확인해야 함
    });
  }, [label, options, toast, variant]);

  return { showToast };
};
