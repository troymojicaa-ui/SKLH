
export default function SiteFooter() {
  return (
    <footer className="bg-sky-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold">Logo</div>
          <p className="mt-3 text-sm text-white/80">
            Join our newsletter to stay up to date on features and releases.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-md px-3 py-2 text-gray-900 text-sm"
            />
            <button className="rounded-md bg-sky-600 px-4 py-2 text-sm hover:bg-sky-700">
              Subscribe
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/60">
            By subscribing, you agree to our Privacy Policy.
          </p>
        </div>

        <div>
          <div className="mb-2 font-medium">Column One</div>
          <ul className="space-y-1 text-sm text-white/80">
            <li>Link One</li><li>Link Two</li><li>Link Three</li>
          </ul>
        </div>

        <div>
          <div className="mb-2 font-medium">Column Two</div>
          <ul className="space-y-1 text-sm text-white/80">
            <li>Link One</li><li>Link Two</li><li>Link Three</li>
          </ul>
        </div>

        <div>
          <div className="mb-2 font-medium">Follow Us</div>
          <ul className="space-y-1 text-sm text-white/80">
            <li>Facebook</li><li>Twitter</li><li>Instagram</li><li>Youtube</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-xs text-white/70">
          <span>© 2024 YourSite. All rights reserved.</span>
          <div className="space-x-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
