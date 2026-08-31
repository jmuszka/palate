import { useSEO } from "./seo";

export default function ComingSoon({ title, path }: { title: string; path?: string }) {
  useSEO({ title: `${title} - EtymoMap`, path });

  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center gap-3 py-12">
      <h2 className="text-zinc-900 text-2xl font-semibold">{title}</h2>
      <p className="text-zinc-500 text-sm max-w-xs">Coming soon...</p>
    </section>
  );
}
