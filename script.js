let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let salario = Number(localStorage.getItem("salario")) || 0;

const CORES = ["#534AB7","#0F6E56","#D85A30","#D4537E","#185FA5","#BA7517","#639922","#993556","#A32D2D","#3C3489"];
const CATS_SUGERIDAS = ["Alimentação","Saúde","Educação","Lazer","Academia","Streaming","Internet","Luz","Água","Farmácia","Roupas","Pets","Seguros","Outros"];
const CORES_ITEM = { Casa:"#22c55e", Aluguel:"#60a5fa", Viagem:"#f59e0b", Consórcio:"#c084fc", Carro:"#f87171", Outros:"#94a3b8" };

let donutChart = null;
let barraChart = null;
let outroIdCounter = 0;

// ========================
// UTILS
// ========================
function fmt(v) {
    return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function showToast(id) {
    let el = document.getElementById(id);
    el.style.display = "flex";
    setTimeout(() => el.style.display = "none", 2500);
}

function showErro(id) {
    let el = document.getElementById(id);
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 3000);
}

function getMes() {
    return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ========================
// HEADER
// ========================
function atualizarHeader() {
    document.getElementById("header-mes").textContent = getMes().charAt(0).toUpperCase() + getMes().slice(1);
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;
    let headerBadge = document.getElementById("header-saldo");
    headerBadge.textContent = "Saldo: " + fmt(saldo);
    headerBadge.style.color = saldo >= 0 ? "#60a5fa" : "#f87171";
    headerBadge.style.borderColor = saldo >= 0 ? "#1e3a5f" : "#3f0e0e";
    headerBadge.style.background = saldo >= 0 ? "#0d2137" : "#1f0606";
}

// ========================
// SALÁRIO
// ========================
function salvarSalario() {
    let val = Number(document.getElementById("salario").value);
    if (!val || val <= 0) return;
    salario = val;
    localStorage.setItem("salario", salario);
    document.getElementById("sim-salario").value = salario;
    showToast("toast-salario");
    atualizarResumo();
    atualizarAnalise();
    atualizarHeader();
}

// ========================
// CATEGORIA
// ========================
function selecionarCategoria(e, cat) {
    document.getElementById("categoriaSelecionada").value = cat;
    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));
    e.currentTarget.classList.add("ativo");
    document.getElementById("erro-categoria").style.display = "none";
}

// ========================
// GASTOS
// ========================
function adicionarGasto() {
    let desc = document.getElementById("descricao").value.trim();
    let valor = document.getElementById("valor").value;
    let categoria = document.getElementById("categoriaSelecionada").value;

    let ok = true;

    if (!categoria) {
        showErro("erro-categoria");
        ok = false;
    }

    if (!desc || !valor || Number(valor) <= 0) {
        showErro("erro-campos");
        ok = false;
    }

    if (!ok) return;

    gastos.push({ desc, valor: Number(valor), categoria });
    localStorage.setItem("gastos", JSON.stringify(gastos));

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("categoriaSelecionada").value = "";
    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));

    showToast("toast-gasto");
    atualizarLista();
    atualizarResumo();
    atualizarAnalise();
    atualizarHeader();
}

// ========================
// LISTA
// ========================
function atualizarLista() {
    let lista = document.getElementById("lista");
    lista.innerHTML = "";

    if (gastos.length === 0) {
        lista.innerHTML = "<li style='text-align:center;color:#2d3f55;font-size:13px;padding:12px 0;'>Nenhum gasto adicionado</li>";
        return;
    }

    gastos.forEach((g, index) => {
        let cor = CORES_ITEM[g.categoria] || "#94a3b8";
        let item = document.createElement("li");
        item.innerHTML = `
            <div class="item">
                <div class="item-left">
                    <div class="item-dot" style="background:${cor};"></div>
                    <div>
                        <div class="item-nome">${g.desc}</div>
                        <div class="item-cat">${g.categoria}</div>
                    </div>
                </div>
                <span class="item-valor" style="color:${cor};">${fmt(g.valor)}</span>
                <button class="btn btn-danger" onclick="removerGasto(${index})">✕</button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function removerGasto(index) {
    gastos.splice(index, 1);
    localStorage.setItem("gastos", JSON.stringify(gastos));
    atualizarLista();
    atualizarResumo();
    atualizarAnalise();
    atualizarHeader();
}

// ========================
// RESUMO
// ========================
function atualizarResumo() {
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;

    let cats = {};
    gastos.forEach(g => {
        cats[g.categoria] = (cats[g.categoria] || 0) + g.valor;
    });

    let listaEl = document.getElementById("resumo-lista");
    listaEl.innerHTML = "";

    if (Object.keys(cats).length === 0) {
        listaEl.innerHTML = "<p style='color:#2d3f55;font-size:13px;padding:8px 0;text-align:center;'>Nenhum gasto registrado</p>";
    } else {
        Object.entries(cats).forEach(([cat, val]) => {
            let row = document.createElement("div");
            row.className = "resumo-row";
            row.innerHTML = `<span class="resumo-lbl">${cat}</span><span class="resumo-val">${fmt(val)}</span>`;
            listaEl.appendChild(row);
        });
    }

    let saldoEl = document.getElementById("saldo");
    saldoEl.textContent = fmt(saldo);
    saldoEl.className = "saldo-val " + (saldo >= 0 ? "positivo" : "negativo");
}

// ========================
// ANÁLISE
// ========================
function atualizarAnalise() {
    try {
        let cats = {};
        gastos.forEach(g => {
            cats[g.categoria] = (cats[g.categoria] || 0) + g.valor;
        });

        // Valores da simulação sobrescrevem
        document.querySelectorAll(".sim-fixo-input").forEach(inp => {
            let cat = inp.dataset.cat;
            let val = parseFloat(inp.value) || 0;
            if (val > 0) cats[cat] = val;
        });

        // Outros personalizados
        let outrosLista = document.getElementById("outros-lista");
        if (outrosLista) {
            outrosLista.querySelectorAll(".outro-row").forEach(row => {
                let id = row.dataset.id;
                let nome = (document.getElementById("outro-nome-" + id)?.value || "").trim();
                let val = parseFloat(document.getElementById("outro-val-" + id)?.value) || 0;
                if (nome && val > 0) cats[nome] = val;
            });
        }

        let labels = Object.keys(cats);
        let valores = Object.values(cats);
        let total = valores.reduce((a, b) => a + b, 0);
        let simSal = parseFloat(document.getElementById("sim-salario")?.value) || salario || 0;
        let sobrou = simSal - total;
        let pct = simSal > 0 ? ((total / simSal) * 100).toFixed(1) : 0;

        document.getElementById("an-salario").textContent = fmt(simSal);
        document.getElementById("an-total").textContent = fmt(total);
        document.getElementById("an-sobrou").textContent = fmt(sobrou);
        document.getElementById("an-pct").textContent = pct + "%";

        // Sem dados
        if (labels.length === 0) {
            if (donutChart) { donutChart.destroy(); donutChart = null; }
            if (barraChart) { barraChart.destroy(); barraChart = null; }
            document.getElementById("legenda-donut").innerHTML =
                "<span style='color:#2d3f55;font-size:12px;'>Adicione gastos para ver a análise</span>";
            document.getElementById("analise-alertas").textContent = "";
            return;
        }

        let cores = labels.map((_, i) => CORES[i % CORES.length]);

        // Donut
        let ctxD = document.getElementById("graficoDonut").getContext("2d");
        if (donutChart) donutChart.destroy();
        donutChart = new Chart(ctxD, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: valores, backgroundColor: cores, borderWidth: 2, borderColor: "#111827" }]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => " " + fmt(ctx.parsed) } }
                },
                cutout: "62%"
            }
        });

        // Legenda
        document.getElementById("legenda-donut").innerHTML = labels.map((l, i) =>
            `<div class="legenda-item">
                <div class="legenda-cor" style="background:${cores[i]}"></div>
                <span>${l}</span>
            </div>`
        ).join("");

        // Barra
        let canvasBarra = document.getElementById("graficoBarra");
        canvasBarra.height = Math.max(180, labels.length * 42 + 50);
        let ctxB = canvasBarra.getContext("2d");
        if (barraChart) barraChart.destroy();
        barraChart = new Chart(ctxB, {
            type: "bar",
            data: {
                labels,
                datasets: [{ data: valores, backgroundColor: cores, borderRadius: 4, borderSkipped: false }]
            },
            options: {
                indexAxis: "y",
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => " " + fmt(ctx.parsed.x) } }
                },
                scales: {
                    x: {
                        ticks: { color: "#4b6080", font: { size: 10 }, callback: v => "R$" + (v >= 1000 ? (v/1000).toFixed(1)+"k" : v) },
                        grid: { color: "rgba(255,255,255,0.04)" }
                    },
                    y: {
                        ticks: { color: "#4b6080", font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });

        // Alertas
        let alertas = "";
        labels.forEach((cat, i) => {
            let p = total > 0 ? (valores[i] / total) * 100 : 0;
            if (p > 40) alertas += `⚠️ Muito gasto com ${cat}\n`;
        });
        if (sobrou < 0) alertas += `🔴 Gastos ultrapassam o salário!\n`;
        if (!alertas && total > 0) alertas = "✅ Tudo equilibrado!";
        document.getElementById("analise-alertas").textContent = alertas;

    } catch(e) {
        console.error("Erro na análise:", e);
    }
}

// ========================
// SIMULAÇÃO — campos fixos
// ========================
function gerarCamposSimulacao() {
    let fixos = ["Casa","Aluguel","Carro","Consórcio","Viagem"];
    let grid = document.getElementById("sim-fixos");
    grid.innerHTML = "";

    fixos.forEach(cat => {
        let valAtual = gastos.filter(g => g.categoria === cat).reduce((s, g) => s + g.valor, 0);
        let div = document.createElement("div");
        div.className = "sim-field";
        div.innerHTML = `
            <label>${cat} (R$)</label>
            <input type="number" class="sim-fixo-input" data-cat="${cat}" value="${valAtual || ""}">
        `;
        grid.appendChild(div);
    });

    document.getElementById("sim-salario").value = salario || "";
}

// ========================
// SIMULAÇÃO — outros
// ========================
function adicionarOutro(nome = "", valor = "") {
    let id = outroIdCounter++;
    let div = document.createElement("div");
    div.className = "outro-row";
    div.dataset.id = id;

    let opts = CATS_SUGERIDAS.map(c => `<option value="${c}">`).join("");

    div.innerHTML = `
        <div>
            <label>Categoria</label>
            <input type="text" id="outro-nome-${id}" list="dl-${id}" placeholder="Ex: Alimentação" value="${nome}">
            <datalist id="dl-${id}">${opts}</datalist>
        </div>
        <div>
            <label>Valor (R$)</label>
            <input type="number" id="outro-val-${id}" placeholder="0" value="${valor}">
        </div>
        <button class="btn-remover-outro" onclick="removerOutro(this)">✕</button>
    `;

    document.getElementById("outros-lista").appendChild(div);
}

function removerOutro(btn) {
    btn.closest(".outro-row").remove();
    atualizarAnalise();
}

// ========================
// VIAGEM
// ========================
function mostrarOpcoes() {
    let destino = document.getElementById("destino").value.trim();
    let dias = document.getElementById("dias").value;
    if (!destino || !dias) return alert("Preencha o destino e os dias!");
    document.getElementById("opcoes").style.display = "flex";
}

function calcularViagem() {
    let mesesPlano = Number(document.getElementById("mesesPlano").value);
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let sobra = salario - total;
    let resultado = document.getElementById("resultado");

    if (sobra <= 0) {
        resultado.textContent = "😬 Sem saldo disponível para poupar.";
        return;
    }
    if (!mesesPlano || mesesPlano <= 0) {
        resultado.textContent = "Informe em quantos meses quer viajar!";
        return;
    }

    let metaMensal = sobra / mesesPlano;
    resultado.textContent =
        `💰 Você tem ${fmt(sobra)} sobrando por mês.\n` +
        `📅 Guardando tudo, viaja em ${mesesPlano} ${mesesPlano === 1 ? "mês" : "meses"}.\n` +
        `🎯 Meta mensal: ${fmt(metaMensal)}/mês`;
}

function buscarVoos() {
    let destino = document.getElementById("destino").value;
    window.open(`https://www.skyscanner.com.br/transport/flights-to/${destino}`);
}

function buscarOnibus() {
    window.open(`https://www.clickbus.com.br`);
}

function buscarHotel() {
    let destino = document.getElementById("destino").value;
    window.open(`https://www.booking.com/searchresults.pt-br.html?ss=${destino}`);
}

// ========================
// INICIAR
// ========================
atualizarHeader();
atualizarLista();
atualizarResumo();
gerarCamposSimulacao();
atualizarAnalise();
