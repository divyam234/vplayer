import Link from 'next/link'

const stats = [
  ['22+', 'RTL tests'],
  ['10', 'browser specs'],
  ['1 CSS', 'override layer'],
]

const features = [
  {
    title: 'Headless core, React chrome',
    body: 'Playback behavior stays in TypeScript core while the UI remains fully replaceable with custom controls.',
  },
  {
    title: 'Real playground inside docs',
    body: 'Paste sources, captions, thumbnails, and mini-player settings on /playground without leaving the docs site.',
  },
  {
    title: 'Production edge cases',
    body: 'Focus, fullscreen, hotkeys, aspect ratio, thumbnails, and mini-player behavior are covered by tests and docs.',
  },
  {
    title: 'No skin framework required',
    body: 'Use the single base stylesheet and override stable classes or CSS variables from your app.',
  },
]

export default function HomePage() {
  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/60 p-6 shadow-[0_40px_140px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,197,91,0.28),transparent_32rem),radial-gradient(circle_at_86%_14%,rgba(80,150,255,0.2),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.76_0.12_78)] shadow-[0_0_20px_oklch(0.76_0.12_78)]" />
              VPlayer documentation
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl leading-[0.9] font-black tracking-[-0.085em] text-balance text-white sm:text-7xl lg:text-8xl">
                Build video experiences that survive real users.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                VPlayer pairs a browser-safe headless core with a polished React UI, configurable mini-player, thumbnail
                previews, keyboard shortcuts, and docs that scale from first install to production launch.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/playground"
                className="rounded-full bg-[oklch(0.76_0.12_78)] px-5 py-3 text-sm font-bold text-zinc-950 shadow-[0_20px_60px_rgba(245,197,91,0.24)] transition hover:scale-[1.02] hover:brightness-110"
              >
                Open playground
              </Link>
              <Link
                href="/docs/getting-started"
                className="rounded-full border border-white/12 bg-white/7 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/12"
              >
                Start building
              </Link>
              <Link
                href="/docs/customization"
                className="rounded-full px-5 py-3 text-sm font-bold text-zinc-300 transition hover:text-white"
              >
                Customize UI →
              </Link>
            </div>

            <dl className="grid max-w-xl grid-cols-3 gap-2">
              {stats.map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <dt className="text-2xl font-black tracking-tight text-white">{value}</dt>
                  <dd className="mt-1 text-xs font-medium text-zinc-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-[oklch(0.76_0.12_78_/0.14)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-black shadow-2xl">
              <div className="aspect-video bg-[radial-gradient(circle_at_34%_20%,rgba(245,197,91,0.34),transparent_28%),radial-gradient(circle_at_76%_64%,rgba(70,120,255,0.28),transparent_28%),linear-gradient(135deg,#111827,#020617)]">
                <div className="flex h-full items-center justify-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/12 text-2xl text-white backdrop-blur">
                    ▶
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                  <div className="h-full w-2/3 rounded-full bg-[oklch(0.76_0.12_78)]" />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>Mini-player · captions · VTT thumbnails</span>
                  <span className="rounded-full border border-white/10 px-2 py-1">A cycles aspect</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-sm shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur"
          >
            <h2 className="font-bold text-white">{feature.title}</h2>
            <p className="mt-3 leading-6 text-zinc-400">{feature.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
