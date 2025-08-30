import Phaser from 'phaser';
import { HalftoneUniforms } from '../types';

// Halftone post-processing pipeline for retro-futuristic effect
export class HalftonePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  // Tweakable constants - adjust these for visual tuning
  static readonly DOT_SCALE = 1.25; // Size of halftone dots
  static readonly ANGLE = 0.5; // Rotation angle in radians
  static readonly INTENSITY = 0.8; // Blend intensity (0-1)
  static readonly GRAIN_AMOUNT = 0.02; // Film grain intensity

  private uniforms: HalftoneUniforms;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'HalftonePipeline',
      fragShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uDotScale;
        uniform float uAngle;
        uniform vec3 uForegroundColor;
        uniform vec3 uBackgroundColor;
        uniform float uIntensity;

        // Rotate point around origin
        vec2 rotate(vec2 point, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return vec2(
            point.x * c - point.y * s,
            point.x * s + point.y * c
          );
        }

        // Convert RGB to luminance
        float luma(vec3 color) {
          return dot(color, vec3(0.299, 0.587, 0.114));
        }

        // Ordered dithering pattern (Bayer matrix 4x4)
        float bayer4x4(vec2 uv) {
          const float bayer[16] = float[16](
            0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
            12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
            3.0/16.0, 11.0/16.0, 1.0/16.0,  9.0/16.0,
            15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
          );

          ivec2 coord = ivec2(mod(uv, 4.0));
          return bayer[coord.x + coord.y * 4];
        }

        // Simple noise function for film grain
        float noise(vec2 uv) {
          return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          vec4 color = texture2D(uMainSampler, uv);

          // Convert to grayscale for halftone processing
          float gray = luma(color.rgb);

          // Create rotated UV coordinates for the halftone grid
          vec2 rotatedUV = rotate(uv * uResolution.xy / uDotScale, uAngle);
          vec2 gridUV = fract(rotatedUV);

          // Get Bayer matrix value for ordered dithering
          float threshold = bayer4x4(rotatedUV);

          // Add small amount of film grain
          float grain = (noise(uv * uResolution.xy + uTime) - 0.5) * ${HalftonePipeline.GRAIN_AMOUNT};

          // Apply halftone effect
          float halftone = step(threshold + grain, gray);

          // Mix between original color and halftone effect
          vec3 finalColor = mix(color.rgb, vec3(halftone), uIntensity);

          // Optional color tinting
          finalColor = mix(uBackgroundColor, uForegroundColor, halftone);

          gl_FragColor = vec4(finalColor, color.a);
        }
      `
    });

    // Initialize uniforms
    this.uniforms = {
      uResolution: { x: game.scale.width, y: game.scale.height },
      uTime: 0,
      uDotScale: HalftonePipeline.DOT_SCALE,
      uAngle: HalftonePipeline.ANGLE,
      uForegroundColor: { x: 1.0, y: 1.0, z: 1.0 }, // White
      uBackgroundColor: { x: 0.0, y: 0.0, z: 0.0 }, // Black
      uIntensity: HalftonePipeline.INTENSITY
    };

    // Set initial uniform values
    this.setUniforms();
  }

  onPreRender(): void {
    // Update time uniform for animation
    this.uniforms.uTime += 0.016; // ~60fps delta time
    this.setUniforms();
  }

  onResize(width: number, height: number): void {
    // Update resolution when canvas resizes
    this.uniforms.uResolution.x = width;
    this.uniforms.uResolution.y = height;
    this.setUniforms();
  }

  private setUniforms(): void {
    this.set2f('uResolution', this.uniforms.uResolution.x, this.uniforms.uResolution.y);
    this.set1f('uTime', this.uniforms.uTime);
    this.set1f('uDotScale', this.uniforms.uDotScale);
    this.set1f('uAngle', this.uniforms.uAngle);
    this.set3f('uForegroundColor', this.uniforms.uForegroundColor.x, this.uniforms.uForegroundColor.y, this.uniforms.uForegroundColor.z);
    this.set3f('uBackgroundColor', this.uniforms.uBackgroundColor.x, this.uniforms.uBackgroundColor.y, this.uniforms.uBackgroundColor.z);
    this.set1f('uIntensity', this.uniforms.uIntensity);
  }

  // Methods to adjust effect parameters at runtime
  setDotScale(scale: number): void {
    this.uniforms.uDotScale = scale;
  }

  setAngle(angle: number): void {
    this.uniforms.uAngle = angle;
  }

  setIntensity(intensity: number): void {
    this.uniforms.uIntensity = Math.max(0, Math.min(1, intensity));
  }

  setColors(foreground: Phaser.Display.Color, background: Phaser.Display.Color): void {
    // Convert Phaser color to RGB values (0-1 range)
    const fgRgb = foreground.gl();
    const bgRgb = background.gl();

    this.uniforms.uForegroundColor = {
      x: fgRgb[0],
      y: fgRgb[1],
      z: fgRgb[2]
    };
    this.uniforms.uBackgroundColor = {
      x: bgRgb[0],
      y: bgRgb[1],
      z: bgRgb[2]
    };
  }
}
