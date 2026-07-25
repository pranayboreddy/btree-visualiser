import { type CSSProperties } from "react";
import { CH, CW } from "../theme/tokens";
import type { LaidOutNode } from "../layout/computeLayout";

interface Props {
  node: LaidOutNode;
  highlight: boolean;
  source: boolean;
  foundKey: number | null;
  searchingKey: number | null;
  placedKey: number | null;
  removingKey: number | null;
  /** animation duration multiplier (1 / speed) */
  mult: number;
  /** whether a single-op animation is playing (drives node entrance) */
  animating: boolean;
  onPickKey: (key: number) => void;
}

/** A single node rendered as an SVG box of clickable key cells. */
export function NodeBox({
  node,
  highlight,
  source,
  foundKey,
  searchingKey,
  placedKey,
  removingKey,
  mult,
  animating,
  onPickKey,
}: Props) {
  const boxFill = highlight ? "var(--amber)" : node.leaf ? "var(--leaf)" : "var(--node)";
  const boxStroke = highlight
    ? "var(--amber)"
    : source
      ? "var(--accent)"
      : node.leaf
        ? "var(--edge)"
        : "var(--accent)";

  const innerAnims: string[] = [];
  if (animating) innerAnims.push(`nodeIn ${0.5 * mult}s cubic-bezier(.34,1.3,.64,1) both`);
  if (highlight) innerAnims.push("nodePulse 1.3s ease-in-out infinite");
  else if (source) innerAnims.push("sourcePulse 1.3s ease-in-out infinite");

  const inner: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "center",
    animation: innerAnims.length ? innerAnims.join(", ") : undefined,
  };

  return (
    <g
      transform={`translate(${node.x - node.w / 2},${node.y})`}
      style={{ transition: "transform .45s cubic-bezier(.4,0,.2,1)" }}
    >
      <g style={inner}>
        <rect
          width={node.w}
          height={CH}
          rx={10}
          fill={boxFill}
          fillOpacity={highlight ? 0.16 : 1}
          stroke={boxStroke}
          strokeWidth={highlight || source ? 2.2 : 1.5}
          strokeDasharray={source ? "5 3" : undefined}
          style={{
            filter: "drop-shadow(0 1px 3px var(--shadow))",
            transition: "fill .3s ease, stroke .3s ease",
          }}
        />
        {node.keys.map((k, i) => {
          const st: CSSProperties = { cursor: "pointer" };
          let fill = "var(--ink)";
          let weight = 500;
          if (searchingKey === k) fill = "var(--amber)";
          if (foundKey === k) {
            fill = "var(--green)";
            weight = 700;
            st.transformBox = "fill-box";
            st.transformOrigin = "center";
            st.animation = `foundPop ${0.55 * mult}s ease`;
          }
          if (placedKey === k) {
            fill = "var(--green)";
            weight = 700;
            st.transformBox = "fill-box";
            st.transformOrigin = "center";
            st.animation = `landing ${0.9 * mult}s cubic-bezier(.34,1.3,.64,1)`;
          }
          if (removingKey === k) {
            fill = "var(--rose)";
            weight = 700;
            st.transformBox = "fill-box";
            st.transformOrigin = "center";
            st.animation = `removingPulse ${0.8 * mult}s ease both`;
          }
          return (
            // stop pointer-down here so the canvas pan handler doesn't capture the
            // pointer — otherwise the click never reaches this cell.
            <g
              key={i}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onPickKey(k)}
              style={{ cursor: "pointer" }}
            >
              {i > 0 && (
                <line
                  x1={8 + i * CW}
                  y1={9}
                  x2={8 + i * CW}
                  y2={CH - 9}
                  stroke={node.leaf ? "var(--edge)" : "var(--line-2)"}
                  strokeWidth={1}
                  opacity={0.8}
                />
              )}
              <rect
                x={8 + i * CW - 4}
                y={5}
                width={CW}
                height={CH - 10}
                rx={6}
                fill="transparent"
                style={{ cursor: "pointer" }}
              />
              <text
                x={8 + i * CW + (CW - 16) / 2}
                y={CH / 2 + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--mono)"
                fontSize={14.5}
                fontWeight={weight}
                fill={fill}
                style={st}
              >
                {k}
              </text>
            </g>
          );
        })}
        {node.keys.length === 0 && (
          <text
            x={node.w / 2}
            y={CH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--mono)"
            fontSize={11.5}
            fill="var(--ink-3)"
          >
            empty
          </text>
        )}
      </g>
    </g>
  );
}
