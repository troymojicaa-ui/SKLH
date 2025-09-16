export default function WaveSpotlight() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* wavey gradient background */}
      <div className="absolute inset-x-0 -top-20 -z-10 h-[620px] bg-gradient-to-b from-sky-200 via-sky-300 to-sky-400 opacity-80" />
      <svg
        className="absolute -top-24 -z-10 h-[680px] w-full text-sky-300"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,256L80,240C160,224,320,192,480,202.7C640,213,800,267,960,282.7C1120,299,1280,277,1360,266.7L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </svg>

      {/* floating feature cards like your mock */}
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="relative h-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5">
            <div className="absolute -right-6 -bottom-6 h-24 w-36 rounded-lg bg-gray-200 shadow" />
            <div className="absolute left-6 -top-6 h-20 w-32 rounded-lg bg-gray-200 shadow" />
            <div className="grid h-full place-items-center text-gray-500">Spotlight Card</div>
          </div>
          <div className="relative h-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5">
            <div className="absolute right-6 -top-6 h-20 w-28 rounded-lg bg-gray-200 shadow" />
            <div className="absolute -left-6 bottom-6 h-24 w-36 rounded-lg bg-gray-200 shadow" />
            <div className="grid h-full place-items-center text-gray-500">Spotlight Card</div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <button className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-white shadow hover:bg-sky-800">
            Button
          </button>
        </div>
      </div>
    </section>
  );
}
