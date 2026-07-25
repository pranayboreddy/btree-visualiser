import { BookOpen, Boxes, Moon, Sun } from "lucide-react";
import { REPO_URL } from "../theme/tokens";
import type { TreeMode } from "../core/types";
import type { Theme } from "../hooks/useTheme";
import { cx } from "../lib/cx";
import { GithubMark } from "./GithubMark";
import styles from "./Header.module.css";

interface Props {
  mode: TreeMode;
  onModeChange: (mode: TreeMode) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenLearn: () => void;
  blurb: string;
}

export function Header({ mode, onModeChange, theme, onToggleTheme, onOpenLearn, blurb }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <Boxes size={17} />
        </span>
        <span className={styles.title}>Tree Lab</span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Tree type">
        <button
          role="tab"
          aria-selected={mode === "btree"}
          className={cx(styles.tab, mode === "btree" && styles.tabActive)}
          onClick={() => onModeChange("btree")}
        >
          B-tree
        </button>
        <button
          role="tab"
          aria-selected={mode === "bplus"}
          className={cx(styles.tab, mode === "bplus" && styles.tabActive)}
          onClick={() => onModeChange("bplus")}
        >
          B+ tree
        </button>
      </div>

      <div className={styles.blurb}>{blurb}</div>

      <div className={styles.right}>
        <button className={styles.pillBtn} onClick={onOpenLearn}>
          <BookOpen size={14} />
          How it works
        </button>
        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <a
          className={styles.iconBtn}
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
        >
          <GithubMark size={15} />
        </a>
      </div>
    </header>
  );
}
