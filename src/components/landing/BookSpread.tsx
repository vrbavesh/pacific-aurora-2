import { bookSpreads } from "./book-timeline";
import styles from "./book-journey.module.css";

export default function BookSpread({ index, side = "right" }: { index: number; side?: "left" | "right" }) {
  const spread = bookSpreads[index];
  return <article className={styles.physicalPage} data-side={side} aria-label={side === "right" ? `Book page: ${["Writing", "Worlds", "Connections"][index]}` : undefined} aria-hidden={side === "left" || undefined}>
    {side === "left" ? <><p className={styles.pageBrand}>Pacific Aurora</p><div className={styles.pageTitle}>{spread.title}</div></> : <>
      <h2>{["Writing", "Worlds", "Connections"][index]}</h2>
      <h3>{spread.heading}</h3>
      <p>{spread.body}</p>
      <dl>{spread.details.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      <p className={styles.pageFoot}>Your words. Your world. Your decisions.</p>
    </>}
  </article>;
}
