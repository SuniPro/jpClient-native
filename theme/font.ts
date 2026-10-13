export const font = {
  pretendard: {
    key: 'pretendard',
    label: 'Pretendard',
    family: 'Pretendard',
  },
  pretendardJP: {
    key: 'pretendardJP',
    label: 'pretendard JP',
    family: 'PretendardJP',
  },
  blackHanSans: {
    key: 'blackHanSans',
    label: 'Black Han Sans',
    family: 'BlackHanSans',
  },
  hahmlet: {
    key: 'hahmlet',
    label: 'Hahmlet',
    family: 'Hahmlet',
  },
  gamtanBatang: {
    key: 'gamtanBatang',
    label: 'Gamtan Batang',
    family: 'GamtanBatang',
  },
  gamtanDotum: {
    key: 'gamtanDotum',
    label: 'Gamtan Dotum',
    family: 'GamtanDotum',
  },
  inter: {
    key: 'inter',
    label: 'Inter',
    family: 'Inter',
  },
  roboto: {
    key: 'roboto',
    label: 'Roboto',
    family: 'Roboto',
  },
} as const;

export type FontKey = keyof typeof font;
export const fontList = Object.values(font);
