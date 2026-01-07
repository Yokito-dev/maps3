// Deklarasi untuk SVG (yang tadi)
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

// TAMBAHAN BARU: Deklarasi untuk gambar raster
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';