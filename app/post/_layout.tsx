import { useTheme } from '@/theme';
import { Stack } from 'expo-router';

export default function PostLayout() {
  const theme = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="selectedMediaEdit"
        options={{
          headerShown: false,
          title: 'Selected Media Edit',
        }}
      />
    </Stack>
  );
}
