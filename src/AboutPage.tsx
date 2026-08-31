import { useNavigate } from "react-router-dom";
import { useSEO } from "./seo";

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
        <h3 className="text-zinc-800 text-lg font-semibold">About the EtymoMap Project</h3>

        <p>
          EtymoMap is a historical geolinguistic atlas for visualizing the evolution of natural
          language over time and space.
        </p>

        <p>
          <i>Palate</i> is the atlas client you are currently viewing, while <i>Larynx</i> is the
          linguistics API server responsible for interfacing with the graph database containing
          semantic relations between words and their ancestors, phonetic metadata, phylogenetic
          family trees, and historical geospatial data from peer-reviewed academic sources.
        </p>

        <p>
          Through <i>Palate</i>, one can interface with tools to view a language's geographic
          influence over time, explore Sprachbund diffusion areas and other means of interlingual
          convergence, visualize a word's etymology tree (structured as a directed acyclic graph)
          and trace its phylogenetic heritage, and more. By unifying these spatial, temporal, and
          genealogical layers into a single interface, EtymoMap provides a rich, contextual
          framework for comparative linguistics and historical anthropology. Future plans include
          richer cross-language analysis, demonstrating sound-law changes, and features leveraging
          computational linguistics.
        </p>

        <p>
          Language is not a mere means of communication: it encapsulates entire cultures, dictates
          worldviews, and influences modes of thought, with measurable effects spanning everyday
          human interaction, international diplomacy, artistic expression, and philosophical
          inquiry. EtymoMap's purpose is to open a window onto the cross section of one of the most
          intricate abstract structures in our universe and democratize access to the most profound
          apparatus and driving force of the human experience lying right on our tongues.
        </p>

        <p>
          I created this digital atlas to express my intersecting interests in language, history,
          formal structures, and digital cartography.
        </p>

        <p>
          One of the reasons I love making educational tools is not purely for the pedagogical
          purpose of imparting knowledge onto others, but also as a medium to share my passions and
          to gain a more rigorous understanding of the topics I find intrinsically fascinating.
        </p>

        <p>
          Building EtymoMap served as an excellent vessel to deepen my understanding of theoretical
          linguistics and its subfields while pushing me to solve complex engineering challenges in
          spatial graph indexing and real-time visualization. I would encourage anyone fascinated by
          a subject as multifaceted as linguistics to build a multi-domain tool such as this one -
          it is a powerful way to indulge your inner obsessions while making knowledge more
          accessible to those around you.
        </p>
      </div>
    </>
  );
}
