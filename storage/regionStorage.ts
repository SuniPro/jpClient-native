import type { SelectedRegion } from '@/components/globe/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_REGION_KEY = 'selected-region';

export async function saveSelectedRegion(region: SelectedRegion) {
  await AsyncStorage.setItem(SELECTED_REGION_KEY, JSON.stringify(region));
}

export async function getSelectedRegion(): Promise<SelectedRegion | null> {
  const value = await AsyncStorage.getItem(SELECTED_REGION_KEY);
  return value ? JSON.parse(value) : null;
}

export async function clearSelectedRegion() {
  await AsyncStorage.removeItem(SELECTED_REGION_KEY);
}
