import { useNavigate } from "react-router-dom";
import Markdown from "react-markdown";
import { useSEO } from "./seo";
import about from "./content/about.json";

export default function AboutPage() {
  const navigate = useNavigate();

  useSEO({
    title: "About - EtymoMap",
    path: "/about",
    description:
      "Learn about EtymoMap, a historical geolinguistic atlas for visualizing the evolution of language over time and space.",
  });

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

      <div className="flex flex-col gap-4 text-zinc-600 text-sm leading-relaxed">
        <h3 className="text-zinc-800 text-lg font-semibold">{about.heading}</h3>

        {about.paragraphs.map((paragraph, i) => (
          <Markdown key={i}>{paragraph}</Markdown>
        ))}
      </div>
    </>
  );
}
