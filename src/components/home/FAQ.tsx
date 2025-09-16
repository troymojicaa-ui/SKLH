const faqs = [
  {
    q: "Question text goes here",
    a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.",
  },
  {
    q: "Question text goes here",
    a: "Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.",
  },
  {
    q: "Question text goes here",
    a: "Aenean faucibus nibh et justo cursus id rutrum lorem imperdiet. Nunc ut sem vitae risus tristique posuere.",
  },
];

export default function FAQ() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
          <h2 className="text-center text-2xl font-semibold">Frequently asked questions</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Frequently asked questions ordered by popularity. Add more as needed.
          </p>

          <div className="mt-6 divide-y">
            {faqs.map((f, i) => (
              <details key={i} className="group py-3">
                <summary className="cursor-pointer list-none font-medium">
                  {f.q}
                  <span className="float-right text-gray-400 group-open:rotate-180 transition">
                    ▾
                  </span>
                </summary>
                <p className="mt-2 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button className="rounded-lg bg-sky-700 px-4 py-2 text-white hover:bg-sky-800">
              Get in touch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
