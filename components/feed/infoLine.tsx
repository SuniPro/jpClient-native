import { useTheme } from '@/theme';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '../profile/Avatar';
import { AppText } from '../Text';

export function InfoLine() {
  return (
    <View style={containerStyles.infoContainer}>
      <Avatar size="sm" />
      <View style={containerStyles.profileContainer}>
        <Profile></Profile>
        <TimeLineInfo></TimeLineInfo>
      </View>
    </View>
  );
}

export function Profile() {
  return (
    <View style={containerStyles.writerContainer}>
      <AppText
        allowFontScaling
        numberOfLines={1}
        ellipsizeMode="tail"
        variant="body1"
        color="primary"
        style={[{ textAlign: 'left' }]}
      >
        nana
      </AppText>
      <ColorCircle color={'#123423'}></ColorCircle>
    </View>
  );
}

export function TimeLineInfo() {
  return (
    <View style={containerStyles.feedInfoContainer}>
      <AppText
        allowFontScaling
        numberOfLines={1}
        ellipsizeMode="tail"
        variant="caption"
        color="tertiary"
        style={{ textAlign: 'left' }}
      >
        Seoul, Republic of Korea
      </AppText>
      <AppText
        allowFontScaling
        numberOfLines={1}
        ellipsizeMode="tail"
        variant="caption"
        color="tertiary"
        style={{ textAlign: 'left' }}
      >
        2024.23.22. 13:21
      </AppText>
    </View>
  );
}

export function ColorCircle({ color }: { color: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        colorCircleStyle.container,
        { backgroundColor: color, borderColor: theme.colors.borderSecondary },
      ]}
    ></View>
  );
}

const containerStyles = StyleSheet.create({
  infoContainer: {
    flexShrink: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  writerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '94%',
  },
  feedInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '94%',
  },
});

const style = StyleSheet.create({
  colorInfo: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E3E5E8',
    fontSize: 10,
    lineHeight: 16,
  },
  dateTimeInfo: {
    textAlign: 'right',
    color: '#ABB1BA',
    fontSize: 8,
    lineHeight: 16,
  },
});

const colorCircleStyle = StyleSheet.create({
  container: {
    borderRadius: 9999,
    borderWidth: 1,
    width: 14,
    height: 14,
  },
});
