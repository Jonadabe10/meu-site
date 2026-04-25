let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let salario = Number(localStorage.getItem("salario")) || 0;

// =====================
// SALÁRIO
// =====================
function salvarSalario() {
    salario = Number(document.getElementById("salario").value);
    localStorage.setItem("salario", salario);
    atualizarResumo();
    atualizarAnalise();
}

// =====================
// CATEGORIA
// =====================
function selecionarCategoria(e, cat) {
    document.getElementById("categoriaSelecionada").value = cat;
    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));
    e.currentTarget.classList.add("ativo");
}

// =====================
// GASTOS
// =====================
function adicionarGasto() {
    let desc = document.getElementById("descricao").value;
    let valor = document.getElementById("valor").value;
    let categoria = document.getElementById("categoriaSelecionada").value;

    if (!desc || !valor || !categoria) {
        alert("Preencha tudo!");
        return;
    }

    gastos.push({ desc, valor: Number(valor), categoria });
    localStorage.setItem("gastos", JSON.stringify(gastos));

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";

    atualizarLista();
    atualizarResumo();
    atualizarAnalise();
}

// =====================
// LISTA
// =====================
function atualizarLista() {
    let lista = document.getElementById("lista");
    lista.innerHTML = "";

    gastos.forEach((g, index) => {
        let item = document.createElement("li");
        item.innerHTML = `
            <div class="item">
                <div>
                    <span>${g.desc}</span><br>
                    <small>${g.categoria}</small>
                </div>
                <strong>R$ ${g.valor}</strong>
                <button onclick="removerGasto(${index})">❌</button>
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
}

// =====================
// RESUMO
// =====================
function atualizarResumo() {
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;

    document.getElementById("totalGastos").innerText = "Total: R$ " + total;

    let saldoEl = document.getElementById("saldo");
    saldoEl.innerText = "Saldo: R$ " + saldo;
    saldoEl.className = saldo >= 0 ? "positivo" : "negativo";
}

function mostrarResumo() {
    atualizarResumo();
}

// =====================
// ANÁLISE — gráficos
// =====================
const CORES = ["#534AB7","#0F6E56","#D85A30","#D4537E","#185FA5","#BA7517","#639922","#993556","#A32D2D","#3C3489"];
const CATS_SUGERIDAS = ["Alimentação","Saúde","Educação","Lazer","Academia","Streaming","Internet","Luz","Água","Farmácia","Roupas","Pets","Seguros","Outros"];

let donutChart = null;
let barraChart = null;
let outroIdCounter = 0;

function fmt(v) {
    return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function atualizarAnalise() {
    // Pega dados dos gastos reais agrupados por categoria
    let cats = {};
    gastos.forEach(g => {
        cats[g.categoria] = (cats[g.categoria] || 0) + g.valor;
    });

    // Sobrescreve com valores da simulação se os campos existirem
    let simFixos = document.querySelectorAll(".sim-fixo-input");
    simFixos.forEach(inp => {
        let cat = inp.dataset.cat;
        let val = parseFloat(inp.value) || 0;
        if (val > 0) cats[cat] = val;
        else delete cats[cat];
    });

    // Adiciona "outros" da simulação
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

    // Salário da simulação
    let simSal = parseFloat(document.getElementById("sim-salario")?.value) || salario;
    let sobrou = simSal - total;
    let pct = simSal > 0 ? ((total / simSal) * 100).toFixed(1) : 0;

    // Atualiza cards
    document.getElementById("an-salario").innerText = fmt(simSal);
    document.getElementById("an-total").innerText = fmt(total);
    document.getElementById("an-sobrou").innerText = fmt(sobrou);
    document.getElementById("an-pct").innerText = pct + "%";

    let cores = labels.map((_, i) => CORES[i % CORES.length]);

    // Donut
    let ctxD = document.getElementById("graficoDonut").getContext("2d");
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctxD, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: "#0f172a"
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => " " + fmt(ctx.parsed)
                    }
                }
            },
            cutout: "60%"
        }
    });

    // Legenda do donut
    let leg = document.getElementById("legenda-donut");
    leg.innerHTML = labels.map((l, i) =>
        `<div class="legenda-item">
            <div class="legenda-cor" style="background:${cores[i]}"></div>
            <span>${l}</span>
        </div>`
    ).join("");

    // Barra horizontal
    let altBarra = Math.max(180, labels.length * 40 + 60);
    let canvasBarra = document.getElementById("graficoBarra");
    canvasBarra.height = altBarra;

    let ctxB = canvasBarra.getContext("2d");
    if (barraChart) barraChart.destroy();
    barraChart = new Chart(ctxB, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: "y",
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => " " + fmt(ctx.parsed.x)
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#94a3b8",
                        font: { size: 10 },
                        callback: v => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)
                    },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: {
                    ticks: { color: "#94a3b8", font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });

    // Alertas
    let alertas = "";
    labels.forEach((cat, i) => {
        let pctCat = total > 0 ? (valores[i] / total) * 100 : 0;
        if (pctCat > 40) alertas += `⚠️ Muito gasto com ${cat}\n`;
        if (cat === "Outros" && pctCat > 20) alertas += `💡 Organize melhor "Outros"\n`;
    });
    if (sobrou < 0) alertas += `🔴 Gastos maiores que o salário!\n`;
    if (!alertas) alertas = "✅ Tudo equilibrado!";

    document.getElementById("analise-alertas").innerText = alertas;
}

// =====================
// SIMULAÇÃO — campos fixos
// =====================
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

    // Sincroniza salário
    document.getElementById("sim-salario").value = salario || "";
}

// =====================
// SIMULAÇÃO — outros dinâmicos
// =====================
function adicionarOutro(nome = "", valor = "") {
    let id = outroIdCounter++;
    let div = document.createElement("div");
    div.className = "outro-row";
    div.dataset.id = id;

    let opcoesDatalist = CATS_SUGERIDAS.map(c => `<option value="${c}">`).join("");

    div.innerHTML = `
        <div>
            <label>Categoria</label>
            <input type="text" id="outro-nome-${id}" list="cats-list-${id}" placeholder="Ex: Alimentação" value="${nome}">
            <datalist id="cats-list-${id}">${opcoesDatalist}</datalist>
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

// =====================
// VIAGEM
// =====================
function mostrarOpcoes() {
    let destino = document.getElementById("destino").value;
    let dias = document.getElementById("dias").value;
    if (!destino || !dias) return alert("Preencha!");
    document.getElementById("opcoes").style.display = "block";
}

function calcularViagem() {
    let dias = Number(document.getElementById("dias").value);
    let transporte = Number(document.getElementById("transporte").value);
    let hospedagem = Number(document.getElementById("hospedagem").value);
    let mesesPlano = Number(document.getElementById("mesesPlano").value);

    let custo = transporte + dias * hospedagem;
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let sobra = salario - total;

    if (sobra <= 0) {
        document.getElementById("resultado").innerText = "Sem economia 😬";
        return;
    }

    let meses = custo / sobra;
    let meta = mesesPlano ? custo / mesesPlano : 0;

    document.getElementById("resultado").innerText =
        `Custo: R$ ${custo}\nMeses: ${meses.toFixed(1)}\n` +
        (mesesPlano ? `Guardar: R$ ${meta.toFixed(2)}/mês` : "");
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

// =====================
// INICIAR
// =====================
atualizarLista();
atualizarResumo();
gerarCamposSimulacao();
atualizarAnalise();