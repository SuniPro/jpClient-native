import { Comment, Send } from '@/assets/icons/icon';
import { AppText } from '@/components/Text';
import LikeButton from '@/components/ui/button/LikeButton';
import { useTheme } from '@/theme';
import { StyleSheet, View } from 'react-native';
import { feedLineStyle } from '../style';

export function FunctionLine() {
  const theme = useTheme();

  return (
    <View style={[style.container, feedLineStyle.lineContainer, { paddingLeft: 5 }]}>
      <View style={style.buttonContainer}>
        <LikeButton width={26} height={26} />
        <AppText variant="body2" color="secondary">
          23
        </AppText>
      </View>
      <View style={style.buttonContainer}>
        <Comment width={20} height={20} color={theme.colors.iconDefault} />
        <AppText variant="body2" color="secondary">
          23
        </AppText>
      </View>
      <View style={style.buttonContainer}>
        <Send width={18} height={18} color={theme.colors.iconDefault} />
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  buttonContainer: {
    width: 44,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});
