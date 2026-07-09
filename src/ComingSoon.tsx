import { useEffect } from "react";

export default function ComingSoon({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} - EtymoMap`;
    return () => {
      document.title = "EtymoMap";
    };
  }, [title]);

  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center gap-3 py-12">
      <h2 className="text-zinc-900 text-2xl font-semibold">{title}</h2>
      <p className="text-zinc-500 text-sm max-w-xs">Coming soon...</p>
    </section>
  );
}
