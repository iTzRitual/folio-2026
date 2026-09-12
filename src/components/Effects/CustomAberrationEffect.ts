import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, Vector2, Vector4 } from "three";
import { CONFIG } from "../../config/constants";
import { buildCustomAberrationProgram } from "@/lib/customAberrationShader";

const {
  SCROLL_TAPS,
  SCROLL_BLUR,
  SCROLL_SPLIT,
  SCROLL_VIGNETTE_X_WEIGHT,
  SCROLL_VIGNETTE_FLOOR,
  SCROLL_VIGNETTE_INNER,
  SCROLL_VIGNETTE_OUTER,
} = CONFIG.customAberration;

const buildFragmentShader = (taps: number) => `
${buildCustomAberrationProgram(taps)}

vec4 inputSample(vec2 uv) {
    return texture2D(inputBuffer, uv);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = applyCustomAberration(uv);
}
`;

export class CustomAberrationEffect extends Effect {
  private readonly mouseUniform: Uniform<Vector2>;
  private readonly intensityUniform: Uniform<number>;
  private readonly gridSizeUniform: Uniform<Vector2>;
  private readonly aspectUniform: Uniform<Vector2>;
  private readonly mouseVelocityUniform: Uniform<Vector2>;
  private readonly scrollVelocityUniform: Uniform<number>;
  private readonly scrollBlurUniform: Uniform<number>;
  private readonly scrollSplitUniform: Uniform<number>;
  private readonly scrollVignetteUniform: Uniform<Vector4>;

  constructor(taps: number = SCROLL_TAPS) {
    const mouseUniform = new Uniform(new Vector2(0.5, 0.5));
    const intensityUniform = new Uniform(0.0);
    const gridSizeUniform = new Uniform(new Vector2(80.0, 80.0));
    const aspectUniform = new Uniform(new Vector2(1.0, 1.0));
    const mouseVelocityUniform = new Uniform(new Vector2(0.0, 0.0));
    const scrollVelocityUniform = new Uniform(0.0);
    const scrollBlurUniform = new Uniform(SCROLL_BLUR);
    const scrollSplitUniform = new Uniform(SCROLL_SPLIT);
    const scrollVignetteUniform = new Uniform(
      new Vector4(
        SCROLL_VIGNETTE_X_WEIGHT,
        SCROLL_VIGNETTE_INNER,
        SCROLL_VIGNETTE_OUTER,
        SCROLL_VIGNETTE_FLOOR,
      ),
    );

    super("CustomAberrationEffect", buildFragmentShader(taps), {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform<Vector2 | Vector4 | number>>([
        ["u_mouse", mouseUniform],
        ["u_aberrationIntensity", intensityUniform],
        ["u_gridSize", gridSizeUniform],
        ["u_aspect", aspectUniform],
        ["u_mouseVelocity", mouseVelocityUniform],
        ["u_scrollVelocity", scrollVelocityUniform],
        ["u_scrollBlur", scrollBlurUniform],
        ["u_scrollSplit", scrollSplitUniform],
        ["u_scrollVignette", scrollVignetteUniform],
      ]),
    });

    this.mouseUniform = mouseUniform;
    this.intensityUniform = intensityUniform;
    this.gridSizeUniform = gridSizeUniform;
    this.aspectUniform = aspectUniform;
    this.mouseVelocityUniform = mouseVelocityUniform;
    this.scrollVelocityUniform = scrollVelocityUniform;
    this.scrollBlurUniform = scrollBlurUniform;
    this.scrollSplitUniform = scrollSplitUniform;
    this.scrollVignetteUniform = scrollVignetteUniform;
  }

  setGrid(columns: number, rows: number, aspect: number) {
    this.gridSizeUniform.value.set(columns, rows);
    this.aspectUniform.value.set(aspect, 1);
  }

  setPointer(position: Vector2, intensity: number, velocityX: number, velocityY: number) {
    this.mouseUniform.value.copy(position);
    this.intensityUniform.value = intensity;
    this.mouseVelocityUniform.value.set(velocityX, velocityY);
  }

  setScroll(
    velocity: number,
    blur: number,
    split: number,
    vignetteXWeight: number,
    vignetteInner: number,
    vignetteOuter: number,
    vignetteFloor: number,
  ) {
    this.scrollVelocityUniform.value = velocity;
    this.scrollBlurUniform.value = blur;
    this.scrollSplitUniform.value = split;
    this.scrollVignetteUniform.value.set(
      vignetteXWeight,
      vignetteInner,
      vignetteOuter,
      vignetteFloor,
    );
  }
}
