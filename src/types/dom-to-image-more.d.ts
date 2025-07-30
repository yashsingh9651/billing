declare module 'dom-to-image-more' {
  export function toPng(node: HTMLElement, options?: object): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: object): Promise<string>;
  export function toBlob(node: HTMLElement, options?: object): Promise<Blob>;
  export function toPixelData(node: HTMLElement, options?: object): Promise<Uint8Array>;
  export function toSvg(node: HTMLElement, options?: object): Promise<string>;
  export default {
    toPng,
    toJpeg,
    toBlob,
    toPixelData,
    toSvg
  };
}
