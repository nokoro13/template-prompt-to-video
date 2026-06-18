/** Max bytes per style reference image (create + append). */
export const MAX_STYLE_IMAGE_BYTES = 10 * 1024 * 1024;

/** Each channel style stores 1–2 art-style reference images for Gemini. */
export const MIN_REFERENCE_IMAGES_PER_STYLE = 1;
export const MAX_REFERENCE_IMAGES_PER_STYLE = 2;

export function tooManyReferenceImagesMessage(): string {
  return `Each style supports up to ${MAX_REFERENCE_IMAGES_PER_STYLE} reference images. Remove one before adding another.`;
}

export function tooFewReferenceImagesMessage(): string {
  return `Each style needs at least ${MIN_REFERENCE_IMAGES_PER_STYLE} reference image. Your changes were not saved.`;
}

export function referenceImagesPendingHint(): string {
  return `At least ${MIN_REFERENCE_IMAGES_PER_STYLE} reference image is required. Your saved images are unchanged.`;
}
