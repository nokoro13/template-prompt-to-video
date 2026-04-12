import { makeTransform, scale, translateY } from "@remotion/animation-utils";
import { loadFont } from "@remotion/google-fonts/BreeSerif";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";

export const Word: React.FC<{
  enterProgress: number;
  text: string;
  stroke: boolean;
}> = ({ enterProgress, text, stroke }) => {
  const { fontFamily } = loadFont();
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const desiredFontSize = Math.min(64, Math.round(frameWidth * 0.1));

  const fittedText = fitText({
    fontFamily,
    text,
    withinWidth: frameWidth * 0.85,
  });

  const fontSize = Math.min(desiredFontSize, fittedText.fontSize);
  const bottomOffset = Math.round(frameHeight * 0.08);
  const captionBand = Math.max(100, Math.round(frameHeight * 0.12));
  const strokePx = Math.min(12, Math.max(10, Math.round(frameWidth * 0.012)));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        top: undefined,
        bottom: bottomOffset,
        height: captionBand,
      }}
    >
      <div
        style={{
          fontSize,
          color: "white",
          WebkitTextStroke: stroke ? `${strokePx}px black` : undefined,
          transform: makeTransform([
            scale(interpolate(enterProgress, [0, 1], [0.8, 1])),
            translateY(
              interpolate(enterProgress, [0, 1], [
                Math.round(frameHeight * 0.001),
                0,
              ]),
            ),
          ]),
          fontFamily,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
