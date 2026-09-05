import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSEO } from "./seo";
import BackButton from "./BackButton";

type Category = "suggestion" | "bug" | "feedback";

type Status = "idle" | "submitting" | "success" | "error";

const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "suggestion", label: "Suggestion", description: "An idea to improve EtymoMap" },
  { value: "bug", label: "Bug report", description: "Something that isn't working right" },
  { value: "feedback", label: "Feedback", description: "General thoughts or questions" },
];

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("suggestion");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useSEO({
    title: "Feedback - EtymoMap",
    path: "/feedback",
    description:
      "Have a suggestion, found a bug, or want to share your thoughts about EtymoMap? Send us feedback.",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3_ACCESS_KEY,
          category,
          name,
          email,
          message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("");
      } else {
        setStatus("error");
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Could not reach the submission service. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center gap-3 py-12">
        <h2 className="text-zinc-900 text-2xl font-semibold">Thank you!</h2>
        <p className="text-zinc-500 text-sm max-w-xs">
          Your submission has been received. Thank you for taking the time.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
        >
          Back home
        </button>
      </div>
    );
  }

  return (
    <>
      <BackButton />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-zinc-800 text-lg font-semibold">Send feedback</h3>
          <p className="mt-1 text-zinc-500 text-sm">
            Have a suggestion, found a bug, or just want to share your thoughts? Submit it below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-700">What's this about?</legend>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    category === c.value
                      ? "border-zinc-500 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                    className="mt-0.5 accent-zinc-900"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-800">{c.label}</span>
                    <span className="text-xs text-zinc-500">{c.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Name (optional)</span>
              <input
                type="text"
                value={name}
                placeholder="Ferdinand de Saussure"
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 shadow-sm outline-none focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-200 transition"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Email (optional)</span>
              <input
                type="email"
                value={email}
                placeholder="name@email.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 shadow-sm outline-none focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-200 transition"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Share your thoughts…"
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 shadow-sm outline-none focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-200 transition resize-y"
            />
          </label>

          {status === "error" && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "submitting" && <Loader2 size={16} className="animate-spin" />}
            Submit
          </button>
        </form>
      </div>
    </>
  );
}
