export type FeatureNoWidth = {
  id: string;
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
};
