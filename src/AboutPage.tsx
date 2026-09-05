import Markdown from "react-markdown";
import { useSEO } from "./seo";
import about from "./content/about.json";
import BackButton from "./BackButton";

export default function AboutPage() {
  useSEO({
    title: "About - EtymoMap",
    path: "/about",
    description:
      "Learn about EtymoMap, a historical geolinguistic atlas for visualizing the evolution of language over time and space.",
  });

  return (
    <>
      <BackButton />

      <div className="flex flex-col gap-4 text-zinc-600 text-sm leading-relaxed">
        <h3 className="text-zinc-800 text-lg font-semibold">{about.heading}</h3>

        {about.paragraphs.map((paragraph, i) => (
          <Markdown key={i}>{paragraph}</Markdown>
        ))}
      </div>
    </>
  );
}
