const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Função para resetar o leaderboard se a data mudou
function resetLeaderboardIfNewDay() {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  db.get(`SELECT date FROM leaderboard ORDER BY date DESC LIMIT 1`, [], (err, row) => {
    if (err) {
      console.error("Erro ao verificar data do leaderboard:", err.message);
      return;
    }
    const lastDate = row ? row.date : null;
    if (lastDate !== today) {
      db.run(`DELETE FROM leaderboard`, [], (err) => {
        if (err) console.error("Erro ao resetar leaderboard:", err.message);
        else console.log("Leaderboard resetado para o novo dia.");
      });
    }
  });
}

// Rota para buscar perguntas diárias com base na data atual
app.get("/questions", (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  db.all(
    `SELECT questions.id AS question_id, questions.text AS question_text, options.id AS option_id, options.text AS option_text, options.is_correct
     FROM questions
     JOIN options ON questions.id = options.question_id
     WHERE questions.date = ?`,
    [today],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const questions = [];
      rows.forEach((row) => {
        let question = questions.find((q) => q.id === row.question_id);
        if (!question) {
          question = { id: row.question_id, text: row.question_text, options: [] };
          questions.push(question);
        }
        question.options.push({ id: row.option_id, text: row.option_text, is_correct: row.is_correct });
      });

      if (questions.length === 0) {
        res.json({ message: "Nenhuma pergunta disponível para hoje." });
      } else {
        res.json(questions);
      }
    }
  );
});

// Rota para salvar a pontuação no quadro de liderança com a data atual
// Rota para salvar a pontuação no quadro de liderança com a data atual
app.post("/leaderboard", (req, res) => {
  const { name, score } = req.body;
  const today = new Date().toISOString().split('T')[0]; // Data no formato YYYY-MM-DD

  // Verifica se o nome já existe no leaderboard do dia atual
  db.get(`SELECT * FROM leaderboard WHERE name = ? AND date = ?`, [name, today], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      // O nome já existe para o dia atual, então retorna um erro
      res.status(400).json({ error: "Nome já existe no leaderboard para hoje. Escolha um nome diferente." });
      return;
    }

    // Insere o novo nome e pontuação no leaderboard
    db.run(
      `INSERT INTO leaderboard (name, score, date) VALUES (?, ?, ?)`,
      [name, score, today],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: "Pontuação salva!" });
      }
    );
  });
});

// Rota para obter o quadro de liderança do dia atual
app.get("/leaderboard/today", (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

  db.all(`SELECT * FROM leaderboard WHERE date = ? ORDER BY score DESC`, [today], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ date: today, leaderboard: rows });
  });
});

// Endpoint para resetar manualmente o leaderboard (para uso interno)
app.post("/leaderboard/reset", (req, res) => {
  db.run(`DELETE FROM leaderboard`, [], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: "Leaderboard resetado com sucesso." });
    }
  });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});