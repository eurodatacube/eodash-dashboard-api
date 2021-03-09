import { Feature } from '../domain/feature';
import { FeatureNoWidth } from '../dto/feature-no-width';

export function featureToWithoutWidthMapper(feature: Feature): FeatureNoWidth {
  const { width, ...withoutWidth } = feature;

  return withoutWidth;
}
