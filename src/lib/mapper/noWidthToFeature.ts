import { Feature, FEATURE_MAX_WIDTH } from '../domain/feature';
import { FeatureNoWidth } from '../dto/feature-no-width';

export function noWidthToFeatureMapper(noWidth: FeatureNoWidth): Feature {
  return {
    width: FEATURE_MAX_WIDTH,
    ...noWidth,
  };
}
