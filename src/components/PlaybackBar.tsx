import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cx } from "../lib/cx";
import styles from "./PlaybackBar.module.css";

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];

interface Props {
  hasFrames: boolean;
  playing: boolean;
  message: string;
  pct: number;
  stepLabel: string;
  speed: number;
  onStepBack: () => void;
  onStepFwd: () => void;
  onTogglePlay: () => void;
  onSpeed: (speed: number) => void;
}

export function PlaybackBar(props: Props) {
  return (
    <div className={styles.bar}>
      {props.hasFrames ? (
        <div className={styles.transport}>
          <div className={styles.group}>
            <button className={styles.tBtn} onClick={props.onStepBack} aria-label="Previous step">
              <ChevronLeft size={15} />
            </button>
            <button className={styles.play} onClick={props.onTogglePlay} aria-label="Play or pause">
              {props.playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button className={styles.tBtn} onClick={props.onStepFwd} aria-label="Next step">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className={styles.msgWrap}>
            <div className={styles.msg}>{props.message}</div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${props.pct}%` }} />
            </div>
          </div>
          <div className={styles.stepLabel}>{props.stepLabel}</div>
        </div>
      ) : (
        <div className={styles.idle}>
          Click any key in the tree to load it · drag to pan · scroll to zoom
        </div>
      )}

      <div className={styles.speedWrap}>
        <span className={styles.speedLabel}>Speed</span>
        <div className={styles.speeds} role="group" aria-label="Animation speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={cx(styles.speedBtn, props.speed === s && styles.speedActive)}
              onClick={() => props.onSpeed(s)}
              aria-pressed={props.speed === s}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
