let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let salario = Number(localStorage.getItem("salario")) || 0;

// SALÁRIO
function salvarSalario() {
    salario = Number(document.getElementById("salario").value);
    localStorage.setItem("salario", salario);
    atualizarResumo();
}

// GASTOS
function adicionarGasto() {
    let desc = document.getElementById("descricao").value;
    let valor = document.getElementById("valor").value;

    if (!desc || !valor) {
        alert("Preencha tudo!");
        return;
    }

    gastos.push({ desc, valor: Number(valor) });
    localStorage.setItem("gastos", JSON.stringify(gastos));

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";

    atualizarLista();
    atualizarResumo();
}

function atualizarLista() {
    let lista = document.getElementById("lista");
    lista.innerHTML = "";

    gastos.forEach((g, index) => {
        let item = document.createElement("li");

        item.innerHTML = `
            <div class="item">
                <span>${g.desc}</span>
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
}

// RESUMO
function atualizarResumo() {
    let total = gastos.reduce((soma, g) => soma + g.valor, 0);
    let saldo = salario - total;

    document.getElementById("totalGastos").innerText =
        "Total gasto: R$ " + total;

    document.getElementById("saldo").innerText =
        "Saldo: R$ " + saldo;
}

function mostrarResumo() {
    atualizarResumo();
}

// VIAGEM
function mostrarOpcoes() {
    let destino = document.getElementById("destino").value;
    let dias = document.getElementById("dias").value;

    if (!destino || !dias) {
        alert("Preencha destino e dias!");
        return;
    }

    document.getElementById("opcoes").style.display = "block";
}

function calcularViagem() {
    let destino = document.getElementById("destino").value;
    let dias = Number(document.getElementById("dias").value);
    let transporte = Number(document.getElementById("transporte").value);
    let hospedagem = Number(document.getElementById("hospedagem").value);
    let mesesPlano = Number(document.getElementById("mesesPlano").value);

    let custoHospedagem = dias * hospedagem;
    let totalViagem = transporte + custoHospedagem;

    let totalGastos = gastos.reduce((soma, g) => soma + g.valor, 0);
    let sobraMensal = salario - totalGastos;

    let resultado = document.getElementById("resultado");

    if (sobraMensal <= 0) {
        resultado.innerText = "Você não está conseguindo economizar 😬";
        return;
    }

    let mesesNecessarios = totalViagem / sobraMensal;

    let economiaNecessaria = mesesPlano > 0
        ? totalViagem / mesesPlano
        : 0;

    resultado.innerText =
        `Viagem para ${destino} (${dias} dias)\n` +
        `Custo total: R$ ${totalViagem}\n\n` +
        `💰 Sobra por mês: R$ ${sobraMensal}\n` +
        `📅 Tempo necessário: ${mesesNecessarios.toFixed(1)} meses\n\n` +
        (mesesPlano > 0
            ? `🎯 Para viajar em ${mesesPlano} meses, você precisa guardar: R$ ${economiaNecessaria.toFixed(2)}/mês`
            : "");
}

// REDIRECIONAMENTO

function buscarVoos() {
    let destino = encodeURIComponent(document.getElementById("destino").value);

    if (!destino) {
        alert("Digite um destino!");
        return;
    }

    window.open(`https://www.skyscanner.com.br/transport/flights-to/${destino}`, "_blank");
}

function buscarOnibus() {
    let destino = encodeURIComponent(document.getElementById("destino").value);
    window.open(`https://www.clickbus.com.br/busca/${destino}`, "_blank");
}

function buscarHotel() {
    let destino = encodeURIComponent(document.getElementById("destino").value);
    window.open(`https://www.booking.com/searchresults.pt-br.html?ss=${destino}`, "_blank");
}

// INICIAR
atualizarLista();
atualizarResumo();