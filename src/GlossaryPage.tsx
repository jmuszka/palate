import { useNavigate } from "react-router-dom";
import { useSEO } from "./seo";
import glossary from "./content/glossary.json";

export default function GlossaryPage() {
  const navigate = useNavigate();

  useSEO({ title: "Glossary - EtymoMap", path: "/glossary" });

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors w-fit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3L5 8L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>

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
