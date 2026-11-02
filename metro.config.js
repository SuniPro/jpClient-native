const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');

config.resolver.sourceExts.push('svg');

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
});
