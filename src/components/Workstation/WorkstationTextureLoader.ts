import { ImageBitmapLoader, Loader, SRGBColorSpace, Texture, TextureLoader } from "three";

type ColorTexture = Texture<HTMLImageElement | ImageBitmap>;

export class WorkstationTextureLoader extends Loader<ColorTexture> {
  load(url: string, onLoad: (texture: ColorTexture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
    const loaded = (texture: ColorTexture) => {
      texture.colorSpace = SRGBColorSpace;
      onLoad(texture);
    };
    if (typeof createImageBitmap !== "function") {
      new TextureLoader(this.manager).load(url, loaded, onProgress, onError);
      return;
    }
    const loader = new ImageBitmapLoader(this.manager);
    loader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
    loader.load(url, bitmap => {
      const texture = new Texture(bitmap);
      texture.flipY = false;
      texture.needsUpdate = true;
      texture.addEventListener("dispose", () => bitmap.close());
      loaded(texture);
    }, onProgress, onError);
  }
}
