export function GridOverlay() {
  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none grid"
      style={{
        gridTemplateColumns: "60px 1fr 1fr 1fr 60px",
        gridTemplateRows: "210px 1fr 1fr 1fr 210px",
      }}
    >
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="border-[0.5px] border-red-500/20" />
      ))}
    </div>
  );
}
