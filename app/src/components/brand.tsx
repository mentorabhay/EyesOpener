/**
 * The Eyes Opener mark: two clay eyes looking in at a star, on a clear ground (public/brand/mark.png, 141 x 56, made
 * from the logo by the brand script). It stands beside the name, so it says nothing to a screen reader.
 */
const RATIO = 141 / 56;

export function BrandMark({ height = 28 }: { height?: number }) {
  // The mark is one small fixed picture served as it is: a plain img, so no image service is needed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brand-mark" src="/brand/mark.png" alt="" aria-hidden="true" width={Math.round(height * RATIO)} height={height} decoding="async" />;
}
