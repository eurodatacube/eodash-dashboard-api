export interface Feature {
  id: string;
  width: number;
  title: string;
  mapInfo?: {
    zoom?: number;
    center?: {
      lat: number;
      lng: number;
    };
    direction?: number[];
    position?: number[];
    right?: number[];
    up?: number[];
    dataLayerTime?: string;
    compareLayerTime?: string;
  };
  text?: string;
  __generatedText__?: string;
  [key: string]: any;
}

export const FEATURE_MIN_WIDTH = 1;
export const FEATURE_MAX_WIDTH = 4;
export const FEATURE_WIDTH_STEP = 1;
export const FEATURE_DEFAULT_WIDTH = FEATURE_MAX_WIDTH;
