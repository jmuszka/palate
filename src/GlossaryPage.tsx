import { useSEO } from "./seo";
import glossary from "./content/glossary.json";
import BackButton from "./BackButton";

export default function GlossaryPage() {
  useSEO({ title: "Glossary - EtymoMap", path: "/glossary" });

  return (
    <>
      <BackButton />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-zinc-900 text-2xl font-semibold">{glossary.title}</h2>
          <p className="text-zinc-500 text-sm">{glossary.intro}</p>
        </div>

        {glossary.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h3 className="text-zinc-800 text-lg font-semibold">{section.heading}</h3>
            <dl className="flex flex-col gap-2">
              {section.entries.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-sm font-medium text-zinc-800">{entry.term}</dt>
                  <dd className="text-sm text-zinc-600 leading-relaxed">{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
