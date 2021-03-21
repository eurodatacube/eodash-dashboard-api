export interface Feature {
  id: string;
  width: number;
  title: string;
  [key: string]: any;
}

export const FEATURE_MIN_WIDTH = 1;
export const FEATURE_MAX_WIDTH = 4;
export const FEATURE_WIDTH_STEP = 1;
export const FEATURE_DEFAULT_WIDTH = FEATURE_MAX_WIDTH;
