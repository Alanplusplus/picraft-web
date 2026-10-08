import { ImageResponse } from "next/og";

import { imageDataUri, OG_COLORS, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const COVERS = [
  "birthday-invitation-maker",
  "youtube-thumbnail-maker",
  "sticker-maker",
  "wedding-invitation-maker",
  "book-cover-maker",
  "event-flyer-maker",
];

export default async function Image() {
  const [logo, wordmark, ...covers] = await Promise.all([
    imageDataUri("logo-128.png", 128),
    imageDataUri("wordmark-2x.png", 486),
    ...COVERS.map((slug) => imageDataUri(`scenes/${slug}.webp`, 420)),
  ]);

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
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 590 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logo} width={56} height={56} alt="" />
            <img src={wordmark} width={170} height={39} alt="" style={{ marginLeft: 12 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, lineHeight: 1.1, color: OG_COLORS.ink950 }}>
              Make the thing you need, ready to print, post or upload.
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.3, color: OG_COLORS.ink700, marginTop: 28 }}>
              Invitations, menus, business cards, thumbnails, stickers and more.
            </div>
          </div>
          <div style={{ fontSize: 24, color: OG_COLORS.brand700 }}>picraft.ai</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 444, marginLeft: 40, alignContent: "center" }}>
          {covers.map((cover, index) => (
            <img
              key={COVERS[index]}
              src={cover}
              width={206}
              height={154}
              alt=""
              style={{
                margin: 6,
                borderRadius: 16,
                border: "2px solid #e4e6ea",
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
