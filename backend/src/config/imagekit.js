import ImageKit from 'imagekit';
import dotenv from 'dotenv';

dotenv.config();

let imagekit = null;

/**
 * Initializes and returns the ImageKit SDK client singleton.
 * Validates that credentials exist in the environment.
 * 
 * @returns {ImageKit|null}
 */
export function getImageKitClient() {
  if (imagekit) {
    return imagekit;
  }

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;

  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    console.warn('[ImageKit] Warning: ImageKit credentials missing in environment.');
    return null;
  }

  imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });

  console.log(`[ImageKit] SDK initialized successfully with endpoint: ${IMAGEKIT_URL_ENDPOINT}`);
  return imagekit;
}

/**
 * Returns safe metadata about ImageKit configuration (omitting private keys).
 */
export function getImageKitConfigSummary() {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  return {
    configured: Boolean(IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY),
    publicKey: IMAGEKIT_PUBLIC_KEY ? `${IMAGEKIT_PUBLIC_KEY.slice(0, 8)}***` : undefined,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT || undefined,
  };
}
