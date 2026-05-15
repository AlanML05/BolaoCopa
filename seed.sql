INSERT INTO users (id, name, username, email, password_hash, is_admin, department, pagou)
VALUES
    ('admin-demo', 'Admin Demo', 'admin.demo', 'admin.demo@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 1, 'Administracao', 1),
    ('user-demo', 'Participante Demo', 'participante.demo', 'participante.demo@example.com', '$2b$12$B9EjzWFlX6qiikivLY3gnOW3fzcUWNFhv.Qsd9Uwf5rnW4MzknpZy', 0, 'Convidados', 1)
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
    ('match-demo-001', 'Brasil', 'Japao', '2026-06-11 16:00:00', 'Grupo A', 'A', 'Demo Stadium', NULL, NULL, 0),
    ('match-demo-002', 'Argentina', 'Canada', '2026-06-12 19:00:00', 'Grupo B', 'B', 'Demo Arena', NULL, NULL, 0)
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
