import { ImageResponse } from "next/og";

import { imageDataUri, OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, publicImageDataUri } from "@/lib/og";
import { getScene } from "@/lib/scenes";
import { getStyle, getStylePages, styleExamples } from "@/lib/styles";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getStylePages().map(({ file, style }) => ({ scene: file.scene, style: style.slug }));
}

/**
 * Share image of a style page: the look's first approved example next to its name, so a link to
 * "Y2K Digital Camera Photo Maker" shows the Y2K picture instead of the generic site card.
 */
export default async function Image({ params }: { params: Promise<{ scene: string; style: string }> }) {
  const { scene: sceneSlug, style: styleSlug } = await params;
  const scene = getScene(sceneSlug);
  const found = getStyle(sceneSlug, styleSlug);
  if (!scene || !found) return new Response("Not found", { status: 404 });

  const example = styleExamples(sceneSlug, found.style)[0];
  const [logo, wordmark, picture] = await Promise.all([
    imageDataUri("logo-128.png", 128),
    imageDataUri("wordmark-2x.png", 486),
    example ? publicImageDataUri(example.url, 900) : imageDataUri(`scenes/${scene.slug}.webp`, 900),
  ]);

  // Photos are tall and cards are wide: a tall frame for portrait examples, a wide one for landscape ones.
  const wide = example ? example.width > example.height : true;
  const frame = wide ? { width: 520, height: 330 } : { width: 380, height: 502 };
  const heading = found.style.seo.h1;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${OG_COLORS.brand50}, #ffffff)`,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logo} width={48} height={48} alt="" />
            <img src={wordmark} width={146} height={34} alt="" style={{ marginLeft: 10 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: OG_COLORS.brand700, marginBottom: 14 }}>{scene.name}</div>
            <div style={{ fontSize: heading.length > 26 ? 56 : 68, lineHeight: 1.05, color: OG_COLORS.ink950 }}>
              {heading}
            </div>
          </div>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: OG_COLORS.brand700,
                background: "#ffe3d9",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {scene.badge}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginLeft: 40 }}>
          <img
            src={picture}
            width={frame.width}
            height={frame.height}
            alt=""
            style={{ objectFit: "cover", borderRadius: 24, border: "2px solid #e4e6ea" }}
          />
        </div>
      </div>
    ),
    size,
  );
}
