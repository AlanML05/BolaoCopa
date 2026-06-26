-- Coluna para a escolha do usuário em palpites empatados no mata-mata.
-- Você informou que esta coluna já foi criada no Railway.
-- Para novos ambientes, use:
-- ALTER TABLE bets ADD COLUMN classificado_id INT NULL;

-- Coluna para o classificado real informado pelo admin quando um jogo do mata-mata terminar empatado.
-- Valores usados pelo sistema:
-- 1 = time_a
-- 2 = time_b
ALTER TABLE matches
ADD COLUMN classificado_id INT NULL;
