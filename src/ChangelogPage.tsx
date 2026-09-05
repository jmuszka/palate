import { useSEO } from "./seo";
import changelog from "./content/changelog.json";
import BackButton from "./BackButton";

export default function ChangelogPage() {
  useSEO({ title: "Changelog - EtymoMap", path: "/changelog" });

  return (
    <>
      <BackButton />

      <div className="flex flex-col gap-6 text-zinc-600 text-sm leading-relaxed">
        <h2 className="text-zinc-900 text-2xl font-semibold">{changelog.title}</h2>

        {changelog.releases.map((release) => (
          <section key={release.version} className="flex flex-col gap-3">
            <h3 className="text-zinc-800 text-lg font-semibold">[{release.version}]</h3>
            <p className="italic">{release.summary}</p>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium text-zinc-700">Added</h4>
              <ul className="list-disc pl-5 flex flex-col gap-1">
                {release.added.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
