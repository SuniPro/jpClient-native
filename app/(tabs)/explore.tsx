import GlobeWebView from '@/components/globe/GlobeWebView';
import { SelectedRegion } from '@/components/globe/types';
import { AppText } from '@/components/Text';
import Button from '@/components/ui/button/Button';
import { getSelectedRegion, saveSelectedRegion } from '@/storage/regionStorage';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {router} from "expo-router";

type RegionIndicator = {
  type: 'countrySelected' | 'citySelected';
  name: string;
  countryName?: string;
  lat: number;
  lng: number;
};

export default function SelectRegionScreen() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);

  const handleRegionMessage = async (region: SelectedRegion) => {
    setSelectedRegion(region);
    await saveSelectedRegion(region);
    // router.replace('/');
  };

  const handleMoveToRegion = async () => {
    if (!selectedRegion) return;
    await saveSelectedRegion(selectedRegion);

    const saved = await getSelectedRegion();
    console.log('saved region = ', saved);
    // router.replace('/');
  };

  const handleRegionIndicator = (): RegionIndicator | null => {
    if (!selectedRegion) return null;

    if (selectedRegion.type === 'countrySelected') {
      return {
        type: selectedRegion.type,
        name: selectedRegion.countryName,
        countryName: selectedRegion.countryName,
        lat: selectedRegion.lat,
        lng: selectedRegion.lng,
      };
    }

    return {
      type: selectedRegion.type,
      name: selectedRegion.cityName,
      countryName: selectedRegion.countryName,
      lat: selectedRegion.lat,
      lng: selectedRegion.lng,
    };
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GlobeWebView onRegionMessage={handleRegionMessage} />

      {selectedRegion ? (
        <View style={style.cityViewContainer}>
          <View>
            <AppText color="on" variant="title3">
              {handleRegionIndicator()?.name}
            </AppText>
            <AppText color="on" variant="body2">
              {handleRegionIndicator()?.countryName}
            </AppText>
          </View>
          <View>
            <Button
              variant="solid"
              color="primary"
              label={'move'}
              size="md"
              onPress={handleMoveToRegion}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  cityViewContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  citiIndicaterContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
});
