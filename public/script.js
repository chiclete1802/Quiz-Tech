let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let time = 20;
let timer;
let userAnswers = [];

// Função para carregar perguntas
async function loadQuestions() {
  try {
    const response = await fetch("http://localhost:3000/questions");
    if (!response.ok) {
      throw new Error("Erro ao carregar perguntas: " + response.statusText);
    }
    questions = await response.json();

    if (questions.length === 0) {
      console.error("Nenhuma pergunta disponível para hoje.");
    }
  } catch (error) {
    console.error("Erro ao carregar perguntas:", error);
  }
}

// Função para resetar o leaderboard se a data mudou
async function resetLeaderboardIfNeeded() {
  const today = new Date().toISOString().split('T')[0];
  const response = await fetch("http://localhost:3000/leaderboard/today");

  if (!response.ok) {
    console.error("Erro ao verificar leaderboard:", response.statusText);
    return;
  }

  const leaderboardData = await response.json();

  if (leaderboardData.date !== today) {
    // Chama o endpoint de reset se o leaderboard não for do dia atual
    await fetch("http://localhost:3000/leaderboard/reset", { method: "POST" });
  }
}

// Verificar se o jogador já jogou hoje
function hasPlayedToday() {
  const lastPlayedDate = localStorage.getItem('lastPlayedDate');
  const today = new Date().toISOString().split('T')[0];
  return lastPlayedDate === today;
}

// Salva a data em que o jogador jogou hoje
function setPlayedToday() {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('lastPlayedDate', today);
}

// Inicializar o jogo
function startGame() {
  document.getElementById("bottom").style.display = "none";
  document.getElementById("titulo").style.display = "none";
  document.getElementById("question-container").style.display = "block";
  document.getElementById("timer").style.display = "block";
  currentQuestionIndex = 0;
  score = 0;
  time = 20;
  userAnswers = [];
  setPlayedToday(); // Marca que o jogador jogou hoje
  showQuestion();
  startTimer();
}

function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    gameOver();
    return;
  }

  const question = questions[currentQuestionIndex];
  if (!question) {
    console.error("Pergunta indefinida para o índice:", currentQuestionIndex);
    gameOver();
    return;
  }

  document.getElementById("question").innerText = question.text;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.innerText = option.text;
    button.onclick = () => selectAnswer(option.is_correct, option.text);
    optionsDiv.appendChild(button);
  });
}

function selectAnswer(isCorrect, selectedText) {
  userAnswers.push({ question: questions[currentQuestionIndex].text, selected: selectedText, isCorrect });

  // Mostra a mensagem de feedback
  if (isCorrect) {
    score += 1;
    time += 5;
    showFeedbackMessage("CORRETO!\n+5 segundos", true);
  } else {
    time -= 3;
    showFeedbackMessage("ERRADO!\n-3 segundos", false);
  }
  setTimeout(() => {
    currentQuestionIndex += 1;
    showQuestion();
  }, 1500);
}

function startTimer() {
  document.getElementById("time").innerText = time;
  timer = setInterval(() => {
    time -= 1;
    document.getElementById("time").innerText = time;
    if (time <= 0) {
      clearInterval(timer);
      gameOver();
    }
  }, 1000);
}

function gameOver() {
  clearInterval(timer);
  document.getElementById("question-container").style.display = "none";
  document.getElementById("timer").style.display = "none";
  document.getElementById("result").style.display = "block";
  document.getElementById("titulo").style.display = "none";
  document.getElementById("final-score").innerText = score;

  showUserAnswers();
  document.getElementById("leaderboard-container").style.display = "none"; // Esconder leaderboard
}

document.getElementById("start-btn").addEventListener("click", async () => {
  await loadQuestions();
  document.getElementById("quiz-container").style.display = "flex";
  if (questions.length > 0) {
    startGame();
  } else {
    alert("Não foi possível carregar as perguntas. Tente novamente mais tarde.");
  }
});

document.getElementById("save-score-btn").addEventListener("click", async () => {
  const playerName = document.getElementById("player-name").value;
  if (playerName.trim()) {
    try {
      const response = await fetch("http://localhost:3000/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, score }),
      });

      if (response.ok) {
        await loadLeaderboard(playerName); // Atualiza o leaderboard após salvar a pontuação
        document.getElementById("save-score-btn").style.display = "none";
      }

      else {
        const errorData = await response.json();
        alert(errorData.error); // Exibe o erro retornado do servidor
        return;
      }
    } catch (error) {
      console.error("Erro ao salvar a pontuação:", error);
    }
  }
});

async function loadLeaderboard(currentPlayer) {
  const response = await fetch("http://localhost:3000/leaderboard/today");

  // Verifica se houve erro na requisição
  if (!response.ok) {
    console.error("Erro ao carregar o leaderboard:", response.statusText);
    return;
  }

  const leaderboardData = await response.json(); // Objeto que contém { date, leaderboard }

  const leaderboardList = document.getElementById("leaderboard");
  leaderboardList.innerHTML = "";

  // Agora leaderboardData.leaderboard é a lista de entradas
  leaderboardData.leaderboard.forEach((entry) => {
    const listItem = document.createElement("li");
    if (entry.name === currentPlayer) {
      listItem.style.fontWeight = "bold"; // Destacar o jogador atual
    }
    listItem.textContent = `${entry.name}: ${entry.score} pontos`;
    leaderboardList.appendChild(listItem);
  });

  document.getElementById("quiz-container").style.display = "block";
  document.getElementById("leaderboard-container").style.display = "block"; // Mostrar o quadro de liderança
}

// Checa o reset do quadro de liderança no início
resetLeaderboardIfNeeded();

// Verificar se o jogador já jogou hoje ao carregar a página
window.addEventListener("load", async () => {
  await resetLeaderboardIfNeeded();
  document.getElementById("quiz-container").style.display = "block";
  /*
  if (hasPlayedToday()) {
    document.getElementById("bottom").style.display = "none";
    document.getElementById("played-message").style.display = "block";
    await loadLeaderboard();
  }
  */
});

function showFeedbackMessage(message, isCorrect) {
  const feedbackMessage = document.getElementById("feedback-message");
  if (feedbackMessage) {
    const feedbackMessage = document.getElementById("feedback-message");
    feedbackMessage.innerText = message;
    feedbackMessage.style.color = isCorrect ? "rgb(0, 255, 13)" : "red";
    feedbackMessage.style.display = "block";
    document.getElementById("question").style.opacity = "50%";
    document.getElementById("options").style.opacity = "50%";
    // Oculta a mensagem após 2 segundos
    setTimeout(() => {
      feedbackMessage.style.display = "none";
      document.getElementById("question").style.opacity = "100%";
      document.getElementById("options").style.opacity = "100%";
    }, 1500);
  }
  else {
  console.error("Elemento 'feedback-message' não encontrado.");
  }
}
