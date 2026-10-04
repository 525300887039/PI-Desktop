import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { portalToBody } from "../../../lib/portal-visibility";
import type { ComposerImagePreviewController } from "./hooks/useComposerImagePreview";
import { useComposerImageHover, type ComposerImageHoverTarget } from "./hooks/useComposerImageHover";

/** Distance between the hovered chip and its preview card. */
const PREVIEW_GAP = 8;

/**
 * Hover preview for inline image chips. It stays a read-only card: clicking the
 * chip is what opens the modal preview.
 */
export function ComposerImageHover({ controller, editorRef }: {
  controller: ComposerImagePreviewController;
  editorRef: RefObject<HTMLDivElement | null>;
}) {
  const images = controller.images;
  // The controller hands back a fresh `images` array on every render, so keep
  // the lookup stable: the hover listeners must not detach while the pointer
  // still rests on a chip.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const idForToken = useCallback(
    (token: string) => imagesRef.current.find((image) => image.token === token)?.id ?? null,
    [],
  );
  const hover = useComposerImageHover(editorRef, idForToken);
  // The modal already shows the image; a card behind it would be noise.
  return <ComposerImageHoverCard controller={controller} target={controller.preview ? null : hover} />;
}

function ComposerImageHoverCard({ controller, target }: {
  controller: ComposerImagePreviewController;
  target: ComposerImageHoverTarget | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const source = target ? controller.sources?.get(target.id) : undefined;
  const src = source?.status === "ready" ? source.src : null;
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!target || !card) return;
    // A chip on the first line has no room above it.
    setPlacement(target.anchor.top - card.offsetHeight - PREVIEW_GAP < 0 ? "below" : "above");
  }, [target, src]);
  if (!target || !src) return null;
  return portalToBody(
    <div
      ref={cardRef}
      className="composer-image-hover"
      data-placement={placement}
      role="presentation"
      style={{
        left: target.anchor.left + target.anchor.width / 2,
        top: placement === "above"
          ? target.anchor.top - PREVIEW_GAP
          : target.anchor.bottom + PREVIEW_GAP,
      }}
    >
      <img src={src} alt="" draggable={false} />
    </div>,
  );
}
