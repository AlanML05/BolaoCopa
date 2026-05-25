import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getTakenEmojis, signupUser } from "../services/api";

const EMOJI_OPTIONS = [
  "😀",
  "😎",
  "🤩",
  "🥳",
  "😈",
  "🤠",
  "🥶",
  "🤯",
  "🤖",
  "👽",
  "🐶",
  "🐱",
  "🦁",
  "🐺",
  "🐯",
  "🐼",
  "🐸",
  "🦊",
  "🐲",
  "🦅",
  "🦈",
  "🐬",
  "🐳",
  "🐙",
  "🐢",
  "🦋",
  "🦜",
  "🦚",
  "🦂",
  "🚀",
  "🛸",
  "🚁",
  "🚲",
  "🛵",
  "🚂",
  "🚢",
  "🚗",
  "🚌",
  "🚓",
  "🚑",
  "🚒",
  "🚜",
  "🎮",
  "🎲",
  "🎯",
  "🎸",
  "🎧",
  "🎤",
  "🎬",
  "📚",
  "💎",
  "🔮",
  "🧩",
  "🧠",
  "🧬",
  "🧲",
  "🪄",
  "🥊",
  "🏀",
  "🏆",
];

function normalizeEmojiValue(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFC")
    .replace(/[\uFE0E\uFE0F]/g, "");
}

function getRandomEmoji(currentEmoji, takenEmojis = []) {
  const currentEmojiKey = normalizeEmojiValue(currentEmoji);
  const unavailableEmojis = new Set(takenEmojis.map(normalizeEmojiValue).filter(Boolean));
  const availableOptions = EMOJI_OPTIONS.filter(
    (emoji) =>
      normalizeEmojiValue(emoji) !== currentEmojiKey &&
      !unavailableEmojis.has(normalizeEmojiValue(emoji)),
  );
  const fallbackOptions = EMOJI_OPTIONS.filter(
    (emoji) => !unavailableEmojis.has(normalizeEmojiValue(emoji)),
  );
  const options = availableOptions.length > 0 ? availableOptions : fallbackOptions;
  return options[Math.floor(Math.random() * options.length)] ?? "";
}

export function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    username: "",
    password: "",
    emoji: getRandomEmoji(),
  }));
  const [takenEmojis, setTakenEmojis] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const takenEmojiKeys = new Set(takenEmojis.map(normalizeEmojiValue).filter(Boolean));
  const availableEmojiOptions = EMOJI_OPTIONS.filter(
    (emoji) => !takenEmojiKeys.has(normalizeEmojiValue(emoji)),
  );
  const selectedEmojiTaken = takenEmojiKeys.has(normalizeEmojiValue(form.emoji));
  const hasAvailableEmojis = availableEmojiOptions.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadTakenEmojis() {
      try {
        const emojis = await getTakenEmojis();
        if (!isMounted) {
          return;
        }

        const usedEmojis = Array.isArray(emojis)
          ? emojis.map((emoji) => String(emoji ?? "").trim().normalize("NFC")).filter(Boolean)
          : [];
        setTakenEmojis(usedEmojis);
        setForm((current) => {
          const usedEmojiKeys = new Set(usedEmojis.map(normalizeEmojiValue).filter(Boolean));
          if (!usedEmojiKeys.has(normalizeEmojiValue(current.emoji))) {
            return current;
          }
          return {
            ...current,
            emoji: getRandomEmoji(current.emoji, usedEmojis),
          };
        });
      } catch {
        if (isMounted) {
          setTakenEmojis([]);
        }
      }
    }

    loadTakenEmojis();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (!form.emoji || selectedEmojiTaken) {
      setError("Escolha um emoji disponivel antes de criar sua conta.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await signupUser({
        username: form.username.trim(),
        password: form.password,
        emoji: form.emoji,
      });

      navigate("/login", {
        replace: true,
        state: {
          signupMessage: response.message ?? "Cadastro criado com sucesso. Faca login para continuar.",
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(139,213,255,0.16),transparent_52%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),transparent_20%,transparent_80%,rgba(255,255,255,0.02))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <section className="panel w-full px-6 py-8 sm:px-8 sm:py-10">
          <p className="eyebrow">World Cup Pool</p>
          <h1 className="headline mt-4">Cadastro do Bolao Copa 2026</h1>
          <p className="subtle-copy mt-4 max-w-lg">
            Crie seu usuario de participante para acessar os jogos disponiveis e registrar
            seus palpites dentro do prazo.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Usuario
              </label>
              <input
                type="text"
                className="field"
                placeholder="seu.usuario"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                autoComplete="username"
                disabled={submitting}
                minLength={3}
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Senha
              </label>
              <input
                type="password"
                className="field"
                placeholder="minimo de 6 caracteres"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                autoComplete="new-password"
                disabled={submitting}
                minLength={6}
                maxLength={128}
                required
              />
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    Emoji
                  </label>
                  <p className="mt-2 text-sm text-muted">
                    Escolha um emoji unico para aparecer no ranking.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    Selecionado: <span className="text-xl">{form.emoji}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Emojis em vermelho ja foram escolhidos por outros participantes.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:border-accent/60 hover:bg-accent/15 disabled:opacity-60"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      emoji: getRandomEmoji(current.emoji, takenEmojis),
                    }))
                  }
                  disabled={submitting || !hasAvailableEmojis}
                >
                  🎲 Sortear Meu Emoji
                </button>
              </div>

              <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
                {EMOJI_OPTIONS.map((emoji) => {
                  const isSelected = form.emoji === emoji;
                  const isTaken = takenEmojiKeys.has(normalizeEmojiValue(emoji));
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`flex h-11 w-full items-center justify-center rounded-2xl border text-xl transition ${
                        isTaken
                          ? "cursor-not-allowed border-red-500/70 bg-red-900/50 opacity-50"
                          : isSelected
                          ? "border-accent bg-accent/20 shadow-[0_0_18px_rgba(125,211,252,0.22)]"
                          : "border-line/80 bg-canvas/60 hover:border-accent/50 hover:bg-accent/10"
                      }`}
                      onClick={() => setForm((current) => ({ ...current, emoji }))}
                      disabled={submitting || isTaken}
                      aria-pressed={isSelected}
                      aria-disabled={isTaken}
                      aria-label={`Selecionar emoji ${emoji}`}
                      title={isTaken ? "Emoji ja escolhido" : "Selecionar emoji"}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              {!hasAvailableEmojis ? (
                <p className="mt-3 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  Todos os emojis disponiveis ja foram escolhidos.
                </p>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="button-primary w-full"
              disabled={submitting || !form.emoji || selectedEmojiTaken}
            >
              {submitting ? "Criando conta..." : "Criar conta"}
            </button>

            <p className="text-center text-sm text-muted">
              Ja tem uma conta?{" "}
              <Link className="font-semibold text-accent transition hover:text-ink" to="/login">
                Entrar
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
