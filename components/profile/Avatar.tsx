import { Image, StyleSheet, View } from 'react-native';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarSizeToken = {
  height: number;
  width: number;
  borderRadius: number;
};

export const AvatarSizes: Record<AvatarSize, AvatarSizeToken> = {
  xs: {
    height: 26,
    width: 26,
    borderRadius: 9999,
  },
  sm: {
    height: 30,
    width: 30,
    borderRadius: 9999,
  },
  md: {
    height: 40,
    width: 40,
    borderRadius: 9999,
  },
  lg: {
    height: 46,
    width: 46,
    borderRadius: 9999,
  },
  xl: {
    height: 50,
    width: 50,
    borderRadius: 9999,
  },
};

export function Avatar({ size = 'lg' }: { size: AvatarSize }) {
  const sizeToken = AvatarSizes[size];

  return (
    <View style={[styles.container, sizeToken]}>
      <Image
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        source={{
          uri: 'https://scontent-ssn1-1.cdninstagram.com/v/t51.2885-19/98065447_564812527783516_5163198512594157568_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_cat=104&_nc_oc=Q6cZ2gFLfhSD9777MTNG0DNdRqSOuWSDvrmfQv0-nkcxfPjR_x1e9wcpfeL2SXE1YfyUV4I&_nc_ohc=dlfBxkb6DwgQ7kNvwFloRVS&_nc_gid=FLLk-5bwxv3y-4WngA-Q8w&edm=APoiHPcBAAAA&ccb=7-5&oh=00_Af2_xPpvpAQj6Bvh7c-yHR-LlgHMvZMrbZx1M8QceHET8g&oe=69E79C65&_nc_sid=22de04',
        }}
      ></Image>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
