const scoringRules = [
  {
    title: "Fase de grupos: placar exato",
    points: "2 pontos",
    description:
      "Você acertou o resultado completo da partida, com os gols dos dois times exatamente iguais ao placar oficial.",
  },
  {
    title: "Fase de grupos: tendência correta",
    points: "1 ponto",
    description:
      "Você acertou quem ganhou a partida ou acertou que o jogo terminou empatado, mesmo sem cravar o placar exato.",
  },
  {
    title: "Mata-mata: placar exato",
    points: "5 pontos",
    description:
      "Nos jogos eliminatórios, cravar o placar exato vale mais. Se você apostar empate e também acertar quem avança, ganha +1 ponto.",
  },
  {
    title: "Mata-mata: tendência correta",
    points: "2 pontos",
    description:
      "Se acertar apenas o vencedor ou acertar que o jogo terminou empatado, você soma 2 pontos. Em empate, acertar o classificado rende +1 ponto.",
  },
];

export function RulesPage() {
  return (
    <div className="space-y-7">
      <section className="panel border-accent/10 px-6 py-7">
        <div className="max-w-3xl">
          <p className="eyebrow">Central de Regras</p>
          <h2 className="headline mt-4">Como jogar o Bolão OST</h2>
          <p className="subtle-copy mt-3">
            Consulte as regras principais antes de salvar seus palpites. Tudo foi pensado para
            ser simples, claro e justo para todos os participantes.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
        <article className="panel-strong overflow-hidden">
          <div className="border-b border-line/80 px-6 py-5">
            <p className="eyebrow">Sistema de Pontuação</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              Quanto vale cada acerto?
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              A pontuação premia quem crava o placar e também valoriza quem acerta a tendência
              do jogo.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            {scoringRules.map((rule) => (
              <div
                key={rule.title}
                className="rounded-3xl border border-line/80 bg-canvas/80 px-5 py-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-display text-xl font-semibold text-ink">
                      {rule.title}
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-muted">{rule.description}</p>
                  </div>
                  <span className="w-fit rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-sm font-bold text-yellow-300 shadow-[0_0_18px_rgba(234,179,8,0.16)]">
                    {rule.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-strong border-yellow-300/20 bg-panel-strong/95 px-6 py-6 shadow-[0_0_36px_rgba(234,179,8,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow text-yellow-300/80">Trava de Segurança</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                Regra dos 30 minutos
              </h3>
            </div>
            <span className="w-fit rounded-full border border-yellow-300/50 bg-yellow-300/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">
              Alta prioridade
            </span>
          </div>

          <div className="mt-6 rounded-3xl border border-yellow-300/25 bg-yellow-300/10 px-5 py-5">
            <p className="text-base font-semibold leading-7 text-ink">
              O sistema bloqueia automaticamente novos palpites e qualquer alteração exatamente
              30 minutos antes do horário oficial de início de cada partida.
            </p>
            <p className="mt-4 text-sm leading-6 text-yellow-100/80">
              Depois que a trava é ativada, não existe liberação manual para editar aquele jogo.
              Salve seus palpites com antecedência para evitar ficar de fora.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-canvas/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Antes da trava</p>
              <p className="mt-2 text-sm font-semibold text-success">
                Você pode criar e alterar palpites.
              </p>
            </div>
            <div className="rounded-2xl border border-line/80 bg-canvas/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Depois da trava</p>
              <p className="mt-2 text-sm font-semibold text-warning">
                O jogo fica fechado para edições.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel px-6 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="eyebrow">Dica rápida</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Preencha primeiro os jogos mais próximos para não correr risco com o horário.
            </p>
          </div>
          <div>
            <p className="eyebrow">Mata-mata</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Jogos sem seleções definidas ficam aguardando a organização confirmar os confrontos.
            </p>
          </div>
          <div>
            <p className="eyebrow">Comprovante</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Depois de salvar seus palpites, gere o PDF para conferir tudo com calma.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
