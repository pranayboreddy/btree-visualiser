import { type KeyboardEvent } from "react";
import { Pencil, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import styles from "./ActionBar.module.css";

interface Props {
  keyVal: string;
  newVal: string;
  statusColor: string;
  statusText: string;
  onKeyVal: (v: string) => void;
  onNewVal: (v: string) => void;
  onKeyEnter: () => void;
  onNewEnter: () => void;
  onRandomKey: () => void;
  onInsert: () => void;
  onSearch: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

export function ActionBar(props: Props) {
  const keyDown = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter") fn();
  };

  return (
    <div className={styles.band}>
      <div className={styles.bar}>
        <input
          className={styles.keyInput}
          data-testid="key-input"
          type="number"
          value={props.keyVal}
          onChange={(e) => props.onKeyVal(e.target.value)}
          onKeyDown={keyDown(props.onKeyEnter)}
          placeholder="key"
          aria-label="Key"
        />
        <button
          className={styles.pick}
          onClick={props.onRandomKey}
          aria-label="Pick a key from the tree"
          title="Pick a key that is in the tree"
        >
          <Shuffle size={14} />
        </button>
        <span className={styles.sep} />
        <button className={styles.insert} onClick={props.onInsert} data-testid="insert-btn">
          <Plus size={15} />
          Insert
        </button>
        <button className={styles.search} onClick={props.onSearch} data-testid="search-btn">
          <Search size={15} />
          Search
        </button>
        <button className={styles.delete} onClick={props.onDelete} data-testid="delete-btn">
          <Trash2 size={15} />
          Delete
        </button>
        <span className={styles.sep} />
        <span className={styles.to}>to</span>
        <input
          className={styles.newInput}
          data-testid="new-input"
          type="number"
          value={props.newVal}
          onChange={(e) => props.onNewVal(e.target.value)}
          onKeyDown={keyDown(props.onNewEnter)}
          placeholder="new"
          aria-label="Replacement key"
        />
        <button className={styles.update} onClick={props.onUpdate} data-testid="update-btn">
          <Pencil size={14} />
          Update
        </button>
      </div>

      <span className={styles.status}>
        <span className={styles.dot} style={{ background: props.statusColor }} />
        <span className={styles.statusText}>{props.statusText}</span>
      </span>
    </div>
  );
}
