export function LuminaIcon({
  className = ""
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center overflow-hidden ${className}`}
    >
      <img
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
        src="/biao.png"
      />
    </span>
  );
}
