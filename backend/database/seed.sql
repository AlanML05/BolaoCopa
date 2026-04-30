use railway;
INSERT INTO users (id, name, username, email, password_hash, is_admin, department, pagou)
VALUES
    ('admin', 'Admin', 'admin', 'admin@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 1, 'Administracao', 0),
    ('ana-silva', 'Ana Silva', 'ana.silva', 'ana@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Financeiro', 1),
    ('bruno-costa', 'Bruno Costa', 'bruno.costa', 'bruno@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Comercial', 1),
    ('carla-souza', 'Carla Souza', 'carla.souza', 'carla@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'RH', 0),
    ('diego-lima', 'Diego Lima', 'diego.lima', 'diego@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Tecnologia', 1),
    ('elisa-almeida', 'Elisa Almeida', 'elisa.almeida', 'elisa@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Marketing', 1),
    ('felipe-rocha', 'Felipe Rocha', 'felipe.rocha', 'felipe@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Juridico', 0)
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
    ('match-001', 'Catar', 'Equador', '2022-11-20 13:00:00', 'Grupo A', 'A', 'Al Bayt Stadium', NULL, NULL, 0),
    ('match-002', 'Senegal', 'Holanda', '2022-11-21 13:00:00', 'Grupo A', 'A', 'Al Thumama Stadium', NULL, NULL, 0),
    ('match-003', 'Argentina', 'Arabia Saudita', '2022-11-22 07:00:00', 'Grupo C', 'C', 'Lusail Iconic Stadium', NULL, NULL, 0),
    ('match-004', 'Dinamarca', 'Tunisia', '2022-11-22 10:00:00', 'Grupo D', 'D', 'Education City Stadium', NULL, NULL, 0),
    ('match-005', 'Mexico', 'Polonia', '2022-11-22 13:00:00', 'Grupo C', 'C', 'Stadium 974', NULL, NULL, 0),
    ('match-006', 'Brasil', 'Servia', '2022-11-24 16:00:00', 'Grupo G', 'G', 'Lusail Iconic Stadium', NULL, NULL, 0),
    ('match-007', 'Holanda', 'Estados Unidos', '2022-12-03 12:00:00', 'Oitavas de Final', 'Mata-Mata', 'Khalifa International Stadium', NULL, NULL, 0),
    ('match-008', 'Argentina', 'Australia', '2022-12-03 16:00:00', 'Oitavas de Final', 'Mata-Mata', 'Ahmad bin Ali Stadium', NULL, NULL, 0),
    ('match-009', 'Inglaterra', 'Senegal', '2022-12-04 16:00:00', 'Oitavas de Final', 'Mata-Mata', 'Al Bayt Stadium', NULL, NULL, 0),
    ('match-010', 'Argentina', 'Croacia', '2022-12-13 16:00:00', 'Semifinal', 'Mata-Mata', 'Lusail Iconic Stadium', NULL, NULL, 0),
    ('match-011', 'Argentina', 'Franca', '2022-12-18 12:00:00', 'Final', 'Mata-Mata', 'Lusail Iconic Stadium', NULL, NULL, 0)
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
    ('bet-001', 'ana-silva', 'match-001', 0, 2, '2022-11-19 09:00:00'),
    ('bet-002', 'ana-silva', 'match-002', 1, 2, '2022-11-19 09:05:00'),
    ('bet-003', 'ana-silva', 'match-003', 2, 0, '2022-11-19 09:10:00'),
    ('bet-004', 'ana-silva', 'match-006', 2, 0, '2022-11-19 09:15:00'),
    ('bet-005', 'ana-silva', 'match-011', 2, 1, '2022-11-19 09:20:00'),
    ('bet-006', 'bruno-costa', 'match-001', 1, 1, '2022-11-19 09:25:00'),
    ('bet-007', 'bruno-costa', 'match-002', 0, 2, '2022-11-19 09:30:00'),
    ('bet-008', 'bruno-costa', 'match-003', 3, 1, '2022-11-19 09:35:00'),
    ('bet-009', 'bruno-costa', 'match-007', 2, 1, '2022-11-19 09:40:00'),
    ('bet-010', 'bruno-costa', 'match-011', 3, 3, '2022-11-19 09:45:00'),
    ('bet-011', 'carla-souza', 'match-001', 0, 1, '2022-11-19 09:50:00'),
    ('bet-012', 'carla-souza', 'match-002', 1, 1, '2022-11-19 09:55:00'),
    ('bet-013', 'carla-souza', 'match-004', 1, 0, '2022-11-19 10:00:00'),
    ('bet-014', 'carla-souza', 'match-008', 2, 0, '2022-11-19 10:05:00'),
    ('bet-015', 'carla-souza', 'match-011', 1, 1, '2022-11-19 10:10:00'),
    ('bet-016', 'diego-lima', 'match-001', 0, 2, '2022-11-19 10:15:00'),
    ('bet-017', 'diego-lima', 'match-002', 0, 1, '2022-11-19 10:20:00'),
    ('bet-018', 'diego-lima', 'match-005', 1, 0, '2022-11-19 10:25:00'),
    ('bet-019', 'diego-lima', 'match-010', 2, 0, '2022-11-19 10:30:00'),
    ('bet-020', 'diego-lima', 'match-011', 2, 2, '2022-11-19 10:35:00'),
    ('bet-021', 'elisa-almeida', 'match-001', 1, 2, '2022-11-19 10:40:00'),
    ('bet-022', 'elisa-almeida', 'match-002', 0, 2, '2022-11-19 10:45:00'),
    ('bet-023', 'elisa-almeida', 'match-003', 1, 2, '2022-11-19 10:50:00'),
    ('bet-024', 'elisa-almeida', 'match-009', 2, 0, '2022-11-19 10:55:00'),
    ('bet-025', 'elisa-almeida', 'match-011', 3, 2, '2022-11-19 11:00:00'),
    ('bet-026', 'felipe-rocha', 'match-001', 0, 0, '2022-11-19 11:05:00'),
    ('bet-027', 'felipe-rocha', 'match-002', 1, 0, '2022-11-19 11:10:00'),
    ('bet-028', 'felipe-rocha', 'match-003', 2, 1, '2022-11-19 11:15:00'),
    ('bet-029', 'felipe-rocha', 'match-006', 3, 1, '2022-11-19 11:20:00'),
    ('bet-030', 'felipe-rocha', 'match-011', 0, 1, '2022-11-19 11:25:00'),
    ('bet-031', 'ana-silva', 'match-007', 2, 1, '2022-11-30 09:00:00'),
    ('bet-032', 'ana-silva', 'match-008', 2, 1, '2022-11-30 09:05:00'),
    ('bet-033', 'bruno-costa', 'match-006', 2, 0, '2022-11-30 09:10:00'),
    ('bet-034', 'bruno-costa', 'match-008', 2, 0, '2022-11-30 09:15:00'),
    ('bet-035', 'carla-souza', 'match-006', 1, 0, '2022-11-30 09:20:00'),
    ('bet-036', 'carla-souza', 'match-009', 3, 0, '2022-11-30 09:25:00'),
    ('bet-037', 'diego-lima', 'match-007', 3, 1, '2022-11-30 09:30:00'),
    ('bet-038', 'diego-lima', 'match-009', 2, 0, '2022-11-30 09:35:00'),
    ('bet-039', 'elisa-almeida', 'match-006', 2, 1, '2022-11-30 09:40:00'),
    ('bet-040', 'elisa-almeida', 'match-010', 2, 1, '2022-11-30 09:45:00')
ON DUPLICATE KEY UPDATE
    palpite_a = VALUES(palpite_a),
    palpite_b = VALUES(palpite_b),
    created_at = VALUES(created_at);
