let questions = [];
let answers = {};
let results = {};

// --- Загрузка вопросов ---
async function loadQuestions() {
  const res = await fetch("./questions.json");
  const data = await res.json();
  return data.sort(() => Math.random() - 0.5); // перемешиваем
}

async function startTest() {
  questions = await loadQuestions();
  answers = {};
  results = {};

  const quiz = document.getElementById("quiz");
  quiz.innerHTML = "";

  questions.forEach(q => {
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `<p>${q.text}</p>` +
      [1,2,3,4,5].map(num =>
        `<label><input type="radio" name="${q.id}" value="${num}" onchange="setAnswer('${q.id}',${num})"> ${num}</label>`
      ).join(" ");
    quiz.appendChild(div);
  });

  document.getElementById("user-form").classList.add("hidden");
  quiz.classList.remove("hidden");
  document.getElementById("finish-btn").classList.remove("hidden");
}

function setAnswer(id, value) {
  answers[id] = value;
}

function finishTest() {
  results = calculateResults();
  showResults();
}

// --- Подсчёт результатов ---
function calculateResults() {
  const res = {
    levels: { healthy: 0, neurotic: 0, unhealthy: 0 },
    harmonics: { competent: 0, emotional: 0, positive: 0, to_people: 0, against_people: 0, away_from_people: 0 },
    instincts: { self_pres: 0, social: 0, sexual: 0 }
  };

  questions.forEach(q => {
    // Если ответа нет → ставим средний балл = 3
    const val = answers[q.id] !== undefined ? answers[q.id] : 3;
    if (q.group === "levels") res.levels[q.subgroup] += val;
    if (q.group === "harmonics") res.harmonics[q.subgroup] += val;
    if (q.group === "instincts") res.instincts[q.subgroup] += val;
  });

  return res;
}

// --- Интерпретация ---
function interpretResults(res) {
  let text = "";

  const lvlMax = Object.entries(res.levels).sort((a,b)=>b[1]-a[1])[0][0];
  const groupMax = ["competent","emotional","positive"].map(k => [k,res.harmonics[k]]).sort((a,b)=>b[1]-a[1])[0][0];
  const styleMax = ["to_people","against_people","away_from_people"].map(k => [k,res.harmonics[k]]).sort((a,b)=>b[1]-a[1])[0][0];
  const instOrder = Object.entries(res.instincts).sort((a,b)=>b[1]-a[1]);

  text += `- Ведущий уровень: ${lvlMax}\n`;
  text += `- Ведущая гармоническая группа: ${groupMax}\n`;
  text += `- Ведущий социальный стиль: ${styleMax}\n`;
  text += `- Инстинкты: ведущий – ${instOrder[0][0]}, вспомогательный – ${instOrder[1][0]}, слепая зона – ${instOrder[2][0]}\n`;

  return text;
}

// --- Помощник: баллы + проценты ---
function withPercents(obj, title) {
  const total = Object.values(obj).reduce((a,b)=>a+b,0);
  let s = `${title}:\n`;
  for (const [k,v] of Object.entries(obj)) {
    const pct = total > 0 ? Math.round((v/total)*100) : 0;
    s += `- ${k}: ${v} (${pct}%)\n`;
  }
  return s + "\n";
}

function withPercentsForDoc(obj) {
  const total = Object.values(obj).reduce((a,b)=>a+b,0);
  return Object.entries(obj).map(([k,v]) => {
    const pct = total > 0 ? Math.round((v/total)*100) : 0;
    return `${k}: ${v} (${pct}%)`;
  });
}

// --- Показ результатов ---
function showResults() {
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("finish-btn").classList.add("hidden");

  const r = document.getElementById("results");
  r.classList.remove("hidden");
  r.innerHTML = `
    <h2>Результаты</h2>
    <h3>👉 Итог</h3>
    <pre>${interpretResults(results)}</pre>
    <h3>Подробности</h3>
    <pre>
${withPercents(results.levels, "🧩 Уровни развития")}
${withPercents(results.harmonics, "🎭 Гармонические группы и стили")}
${withPercents(results.instincts, "⚡ Инстинкты")}
    </pre>
  `;

  document.getElementById("export").classList.remove("hidden");
}

// --- Экспорт JSON ---
function exportJSON() {
  const data = {
    name: document.getElementById("name").value,
    surname: document.getElementById("surname").value,
    date: new Date().toISOString().slice(0, 10),
    results,
    interpretation: interpretResults(results)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  saveAs(blob, "results.json");
}

// --- Экспорт DOCX ---
async function exportDOCX() {
  const { Document, Packer, Paragraph, HeadingLevel } = docx;

  const interpretation = interpretResults(results);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "Отчёт по тесту Эннеаграммы", heading: HeadingLevel.TITLE }),
        new Paragraph(`Имя: ${document.getElementById("name").value} ${document.getElementById("surname").value}`),
        new Paragraph(`Дата: ${new Date().toLocaleDateString()}`),
        new Paragraph(""),

        // Итог в начале
        new Paragraph({ text: "👉 Итог", heading: HeadingLevel.HEADING_2 }),
        ...interpretation.split("\n").map(line => new Paragraph(line)),
        new Paragraph(""),

        // Подробности
        new Paragraph({ text: "🧩 Уровни развития", heading: HeadingLevel.HEADING_2 }),
        ...withPercentsForDoc(results.levels).map(t => new Paragraph(t)),

        new Paragraph({ text: "🎭 Гармонические группы и стили", heading: HeadingLevel.HEADING_2 }),
        ...withPercentsForDoc(results.harmonics).map(t => new Paragraph(t)),

        new Paragraph({ text: "⚡ Инстинкты", heading: HeadingLevel.HEADING_2 }),
        ...withPercentsForDoc(results.instincts).map(t => new Paragraph(t))
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "results.docx");
}

// --- Рестарт ---
function restartTest() {
  document.getElementById("results").classList.add("hidden");
  document.getElementById("export").classList.add("hidden");
  document.getElementById("user-form").classList.remove("hidden");
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("finish-btn").classList.add("hidden");
  document.getElementById("results").innerHTML = "";
  answers = {};
  results = {};
}
