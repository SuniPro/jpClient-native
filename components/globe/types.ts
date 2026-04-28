export type SelectedRegion =
    | {
  type: 'countrySelected';
  countryId: string;
  countryName: string;
  lat: number;
  lng: number;
}
    | {
  type: 'citySelected';
  cityId: string;
  cityName: string;
  countryName: string;
  lat: number;
  lng: number;
};
