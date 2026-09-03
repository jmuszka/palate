import { useNavigate } from "react-router-dom";
import { useSEO } from "./seo";
import changelog from "./content/changelog.json";

export default function ChangelogPage() {
  const navigate = useNavigate();

  useSEO({ title: "Changelog - EtymoMap", path: "/changelog" });

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
