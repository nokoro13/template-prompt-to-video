import Image, { type ImageProps } from "next/image";

import { STORAGE_API_PREFIX } from "@/lib/storage/constants";

/** Next.js Image that bypasses the optimizer for authenticated `/api/storage/` URLs. */
export function StorageImage(props: ImageProps) {
  const unoptimized =
    props.unoptimized ??
    (typeof props.src === "string" && props.src.startsWith(STORAGE_API_PREFIX));
  return <Image {...props} unoptimized={unoptimized} />;
}
