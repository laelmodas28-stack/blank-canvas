// Local business simulation math. Used before asking IA to interpret the result.

export interface SimulationInputs {
  precoAtual: number;
  custoProduto: number;
  taxaMarketplacePct: number; // ex: 20 = 20%
  taxaPagamentoPct: number;
  fretePago: number;
  impostoPct: number;
  vendasMes: number;
  gastoAdsMes: number;
  shopeeAcelera: boolean;
  aceleraPct: number; // extra fee if enabled
}

export interface SimulationScenario {
  novoPreco?: number;
  novoCusto?: number;
  novoGastoAds?: number;
  aceleraLigado?: boolean;
  novaTaxaImposto?: number;
}

export interface SimulationOutputs {
  precoUnitario: number;
  custoTotalUnitario: number;
  lucroUnitario: number;
  margemPct: number;
  receitaMes: number;
  lucroMes: number;
  breakEvenPreco: number;
  roi: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export const runSimulation = (
  base: SimulationInputs,
  scenario: SimulationScenario
): { base: SimulationOutputs; cenario: SimulationOutputs; delta: SimulationOutputs } => {
  const compute = (i: SimulationInputs): SimulationOutputs => {
    const preco = i.precoAtual;
    const taxaMkt = (preco * i.taxaMarketplacePct) / 100;
    const taxaPag = (preco * i.taxaPagamentoPct) / 100;
    const acelera = i.shopeeAcelera ? (preco * i.aceleraPct) / 100 : 0;
    const imposto = (preco * i.impostoPct) / 100;
    const custoTotal = i.custoProduto + taxaMkt + taxaPag + acelera + imposto + i.fretePago;
    const lucroUnit = preco - custoTotal;
    const margem = preco > 0 ? (lucroUnit / preco) * 100 : 0;
    const receita = preco * i.vendasMes;
    const lucroMes = lucroUnit * i.vendasMes - i.gastoAdsMes;
    const breakEven =
      i.custoProduto + i.fretePago > 0
        ? (i.custoProduto + i.fretePago) /
          (1 - (i.taxaMarketplacePct + i.taxaPagamentoPct + i.impostoPct + (i.shopeeAcelera ? i.aceleraPct : 0)) / 100 || 0.0001)
        : 0;
    const roi = i.gastoAdsMes > 0 ? (lucroMes / i.gastoAdsMes) * 100 : 0;
    return {
      precoUnitario: round(preco),
      custoTotalUnitario: round(custoTotal),
      lucroUnitario: round(lucroUnit),
      margemPct: round(margem),
      receitaMes: round(receita),
      lucroMes: round(lucroMes),
      breakEvenPreco: round(breakEven),
      roi: round(roi),
    };
  };

  const baseOut = compute(base);
  const scenarioInputs: SimulationInputs = {
    ...base,
    precoAtual: scenario.novoPreco ?? base.precoAtual,
    custoProduto: scenario.novoCusto ?? base.custoProduto,
    gastoAdsMes: scenario.novoGastoAds ?? base.gastoAdsMes,
    shopeeAcelera: scenario.aceleraLigado ?? base.shopeeAcelera,
    impostoPct: scenario.novaTaxaImposto ?? base.impostoPct,
  };
  const cenarioOut = compute(scenarioInputs);

  const delta: SimulationOutputs = {
    precoUnitario: round(cenarioOut.precoUnitario - baseOut.precoUnitario),
    custoTotalUnitario: round(cenarioOut.custoTotalUnitario - baseOut.custoTotalUnitario),
    lucroUnitario: round(cenarioOut.lucroUnitario - baseOut.lucroUnitario),
    margemPct: round(cenarioOut.margemPct - baseOut.margemPct),
    receitaMes: round(cenarioOut.receitaMes - baseOut.receitaMes),
    lucroMes: round(cenarioOut.lucroMes - baseOut.lucroMes),
    breakEvenPreco: round(cenarioOut.breakEvenPreco - baseOut.breakEvenPreco),
    roi: round(cenarioOut.roi - baseOut.roi),
  };

  return { base: baseOut, cenario: cenarioOut, delta };
};
