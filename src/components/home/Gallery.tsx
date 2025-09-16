export default function Gallery() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-200 shadow" />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`b-${i}`} className="aspect-square rounded-xl bg-gray-200 shadow" />
          ))}
        </div>
      </div>
    </section>
  );
}
