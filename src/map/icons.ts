/**
 * A north-pointing plane silhouette as a white-on-transparent SVG data URL.
 * It is registered as an SDF image (see MapView), so MapLibre uses the alpha
 * channel as a mask and tints it via the `icon-color` paint property — that is
 * what lets the same icon render in different state colors (default/selected/
 * military/emergency). The fill must be solid white for SDF tinting to work.
 */
export const PLANE_SVG =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<path d="M16 2 L19 14 L30 20 L30 23 L18 19 L18 27 L22 30 L22 31 L16 29 L10 31 L10 30 L14 27 L14 19 L2 23 L2 20 L13 14 Z" fill="#ffffff"/></svg>`,
  );

/**
 * Decode the plane icon via an HTMLImageElement. `createImageBitmap` on an SVG
 * blob throws "InvalidStateError" in Chromium, so we use an Image element, which
 * decodes SVG reliably.
 */
export function loadPlaneImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load plane icon'));
    img.src = PLANE_SVG;
  });
}
