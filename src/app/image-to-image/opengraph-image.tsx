import { generatorShareImage } from "@/components/generator-og";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return generatorShareImage("image-to-image");
}
