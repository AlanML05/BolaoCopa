INSERT INTO users (id, name, username, email, password_hash, is_admin, department, pagou)
VALUES
    ('admin-ost', 'Mariana Admin', 'admin', 'admin@ost.com.br', SHA2('admin123', 256), 1, 'Operacoes', 0),
    ('ana-silva', 'Ana Silva', 'ana.silva', 'ana@ost.com.br', SHA2('123456', 256), 0, 'Financeiro', 1),
    ('bruno-costa', 'Bruno Costa', 'bruno.costa', 'bruno@ost.com.br', SHA2('123456', 256), 0, 'Comercial', 1),
    ('carla-souza', 'Carla Souza', 'carla.souza', 'carla@ost.com.br', SHA2('123456', 256), 0, 'RH', 0),
    ('diego-lima', 'Diego Lima', 'diego.lima', 'diego@ost.com.br', SHA2('123456', 256), 0, 'Tecnologia', 1),
    ('elisa-almeida', 'Elisa Almeida', 'elisa.almeida', 'elisa@ost.com.br', SHA2('123456', 256), 0, 'Marketing', 1),
    ('felipe-rocha', 'Felipe Rocha', 'felipe.rocha', 'felipe@ost.com.br', SHA2('123456', 256), 0, 'Juridico', 0)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    username = VALUES(username),
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    is_admin = VALUES(is_admin),
    department = VALUES(department),
    pagou = VALUES(pagou);

INSERT INTO matches (id, time_a, time_b, data_hora, fase, grupo, estadio, placar_a, placar_b, finalizado)
VALUES
    ('match-001', 'Brasil', 'Japao', DATE_SUB(NOW(), INTERVAL 7 DAY), 'Grupo A', 'A', 'MetLife Stadium', 2, 1, 1),
    ('match-002', 'Franca', 'Mexico', DATE_SUB(NOW(), INTERVAL 6 DAY), 'Grupo B', 'B', 'SoFi Stadium', 1, 1, 1),
    ('match-003', 'Argentina', 'Estados Unidos', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Grupo C', 'C', 'AT&T Stadium', 0, 2, 1),
    ('match-004', 'Alemanha', 'Senegal', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Grupo D', 'D', 'Mercedes-Benz Stadium', 3, 0, 1),
    ('match-005', 'Espanha', 'Canada', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Grupo E', 'E', 'Estadio Akron', 0, 0, 1),
    ('match-006', 'Portugal', 'Coreia do Sul', DATE_ADD(NOW(), INTERVAL 4 HOUR), 'Grupo A', 'A', 'BC Place', NULL, NULL, 0),
    ('match-007', 'Inglaterra', 'Uruguai', DATE_ADD(NOW(), INTERVAL 20 MINUTE), 'Grupo B', 'B', 'Lumen Field', NULL, NULL, 0),
    ('match-008', 'Holanda', 'Marrocos', DATE_ADD(NOW(), INTERVAL 1 DAY), 'Grupo C', 'C', 'NRG Stadium', NULL, NULL, 0),
    ('match-009', 'Italia', 'Colombia', DATE_ADD(NOW(), INTERVAL 2 DAY), 'Grupo D', 'D', 'Lincoln Financial Field', NULL, NULL, 0),
    ('match-010', '1o Grupo A', '2o Grupo B', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Oitavas de Final', 'Mata-Mata', 'Hard Rock Stadium', NULL, NULL, 0),
    ('match-011', '1o Grupo C', '2o Grupo D', DATE_ADD(NOW(), INTERVAL 8 DAY), 'Oitavas de Final', 'Mata-Mata', 'Gillette Stadium', NULL, NULL, 0)
ON DUPLICATE KEY UPDATE
    time_a = VALUES(time_a),
    time_b = VALUES(time_b),
    data_hora = VALUES(data_hora),
    fase = VALUES(fase),
    grupo = VALUES(grupo),
    estadio = VALUES(estadio),
    placar_a = VALUES(placar_a),
    placar_b = VALUES(placar_b),
    finalizado = VALUES(finalizado);

INSERT INTO bets (id, user_id, match_id, palpite_a, palpite_b, created_at)
VALUES
    ('bet-001', 'ana-silva', 'match-001', 2, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-002', 'ana-silva', 'match-002', 0, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-003', 'ana-silva', 'match-003', 1, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-004', 'ana-silva', 'match-004', 2, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-005', 'ana-silva', 'match-005', 1, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-006', 'bruno-costa', 'match-001', 1, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-007', 'bruno-costa', 'match-002', 1, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-008', 'bruno-costa', 'match-003', 0, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-009', 'bruno-costa', 'match-004', 2, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-010', 'bruno-costa', 'match-005', 0, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-011', 'carla-souza', 'match-001', 2, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-012', 'carla-souza', 'match-002', 2, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-013', 'carla-souza', 'match-003', 1, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-014', 'carla-souza', 'match-004', 0, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-015', 'carla-souza', 'match-005', 0, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-016', 'diego-lima', 'match-001', 2, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-017', 'diego-lima', 'match-002', 0, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-018', 'diego-lima', 'match-003', 0, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-019', 'diego-lima', 'match-004', 1, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-020', 'diego-lima', 'match-005', 2, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-021', 'elisa-almeida', 'match-001', 0, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-022', 'elisa-almeida', 'match-002', 2, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-023', 'elisa-almeida', 'match-003', 0, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-024', 'elisa-almeida', 'match-004', 3, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-025', 'elisa-almeida', 'match-005', 1, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-026', 'felipe-rocha', 'match-001', 1, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-027', 'felipe-rocha', 'match-002', 1, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-028', 'felipe-rocha', 'match-003', 0, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-029', 'felipe-rocha', 'match-004', 2, 0, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-030', 'felipe-rocha', 'match-005', 3, 3, DATE_SUB(NOW(), INTERVAL 8 DAY)),
    ('bet-031', 'ana-silva', 'match-006', 2, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-032', 'ana-silva', 'match-007', 1, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-033', 'bruno-costa', 'match-006', 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-034', 'bruno-costa', 'match-008', 2, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-035', 'carla-souza', 'match-006', 0, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-036', 'carla-souza', 'match-009', 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-037', 'diego-lima', 'match-007', 2, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-038', 'diego-lima', 'match-009', 0, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-039', 'elisa-almeida', 'match-006', 3, 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
    ('bet-040', 'elisa-almeida', 'match-008', 1, 0, DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE
    palpite_a = VALUES(palpite_a),
    palpite_b = VALUES(palpite_b),
    created_at = VALUES(created_at);
