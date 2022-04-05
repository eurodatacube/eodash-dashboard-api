export type FeatureNoWidth = {
  id: string;
  title: string;
  mapInfo?: {
    zoom?: number;
    center?: {
      lat: number;
      lng: number;
    };
    direction?: array;
    position?: array;
    right?: array;
    up?: array;
    dataLayerTime?: string;
    compareLayerTime?: string;
  };
  text?: string;
  __generatedText__?: string;
  [key: string]: any;
};
