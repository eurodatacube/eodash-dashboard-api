export type FeatureNoWidth = {
  id: string;
  title: string;
  mapInfo?: {
    zoom: number;
    center: {
      lat: number;
      lng: number;
    };
  };
  text?: string;
  __generatedText__?: string;
  [key: string]: any;
};
