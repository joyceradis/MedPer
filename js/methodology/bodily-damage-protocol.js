const q = (id, label, options, help = '') => ({ id, label, options, help });
const n = (id, label, help) => ({ id, label, help, type: 'narrative' });

const AXIS_OPTIONS = ['Demonstrado', 'Não demonstrado', 'Indeterminado', 'Não aplicável'];

export const bodilyDamageProtocol = Object.freeze({
  id: 'bodily_damage',
  title: 'Dano corporal / dano pessoal',
  steps: Object.freeze([
    Object.freeze({
      id: 'gates',
      title: '1. Elegibilidade — dano, nexo e consolidação',
      fields: Object.freeze([
        q('personalDamageDamageStatus', 'Há dano biológico relevante ao objeto objetivamente demonstrado?', ['Sim', 'Parcialmente', 'Não', 'Inconclusivo']),
        n('personalDamageDamageBasis', 'Base da demonstração do dano', 'Registre achados, documentos, exames e limitações que sustentam a existência do dano.'),
        q('personalDamageCausalStatus', 'Conclusão causal médico-pericial', ['Nexo sustentado', 'Indeterminado', 'Nexo afastado', 'Não avaliado']),
        n('personalDamageCausalBasis', 'Fundamentação causal', 'Descreva mecanismo, topografia, temporalidade, encadeamento clínico, estado anterior, alternativas e lacunas. Não confunda causalidade médica com culpa.'),
        q('personalDamageConsolidationStatus', 'Situação de cura / consolidação médico-legal', ['Consolidado', 'Não consolidado', 'Indeterminado']),
        n('personalDamageConsolidationBasis', 'Fundamentação da consolidação', 'Registre por que o quadro pode ou não ser considerado estabilizado para valoração permanente definitiva.')
      ])
    }),
    Object.freeze({
      id: 'temporary',
      title: '2. Danos temporários',
      fields: Object.freeze([
        n('temporaryFunctionalTotal', 'Déficit funcional temporário total — período', 'Registre datas/período e fonte documental. Tempo de tratamento não equivale automaticamente a incapacidade total.'),
        n('temporaryFunctionalPartial', 'Déficit funcional temporário parcial — período', 'Registre datas/período, intensidade quando metodologicamente sustentada e fonte.'),
        n('temporaryProfessional', 'Repercussão profissional temporária', 'Registre apenas interferência profissional demonstrável e separe-a do déficit funcional temporário.'),
        n('quantumDolorisSummary', 'Sofrimento / Quantum Doloris — síntese', 'Reconstrua lesões, internações, cirurgias, curativos, analgesia, complicações e duração do tratamento; gradue somente se houver referencial aplicável.'),
        n('temporaryEvidence', 'Fontes e limitações dos danos temporários', 'Indique prontuários, atestados, documentos, relato e lacunas relevantes.')
      ])
    }),
    Object.freeze({
      id: 'permanent_axes',
      title: '3. Eixos permanentes — identificar sem somar',
      fields: Object.freeze([
        q('permanentFunctionalStatus', 'Déficit funcional permanente', AXIS_OPTIONS),
        q('permanentAestheticStatus', 'Prejuízo estético permanente', AXIS_OPTIONS),
        q('permanentProfessionalStatus', 'Repercussão profissional permanente', AXIS_OPTIONS),
        q('permanentLeisureStatus', 'Repercussão em atividade física / lazer', AXIS_OPTIONS),
        q('permanentSocialStatus', 'Repercussão social / exposição', AXIS_OPTIONS),
        q('permanentSexualStatus', 'Repercussão sexual', AXIS_OPTIONS),
        q('thirdPartyDependenceStatus', 'Dependência de terceira pessoa', AXIS_OPTIONS),
        q('scarQualityStatus', 'Qualidade cicatricial requer avaliação complementar?', ['Sim', 'Não', 'Não aplicável', 'Indeterminado'])
      ])
    }),
    Object.freeze({
      id: 'functional',
      title: '4. Eixo funcional permanente',
      fields: Object.freeze([
        n('functionalSequelae', 'Sequelas funcionais elegíveis', 'Descreva cada sequela funcional atribuível ao evento antes de qualquer combinação matemática.'),
        n('functionalReference', 'Barema / referencial funcional', 'Registre a fonte aplicável e o item utilizado. Não infira a tabela pela etiologia do trauma.'),
        n('functionalValuation', 'Valoração funcional', 'Registre o resultado por sequela. Balthazard só pode combinar déficits funcionais se o referencial aplicável autorizar.'),
        n('functionalCombination', 'Regra de combinação, se aplicável', 'Declare capacidade restante/Balthazard ou outra regra somente quando determinada pelo referencial.')
      ])
    }),
    Object.freeze({
      id: 'aesthetic_scar',
      title: '5. Eixo estético e qualidade cicatricial',
      fields: Object.freeze([
        n('aestheticDescription', 'Alteração da imagem corporal', 'Descreva a alteração antes de selecionar instrumento de valoração.'),
        n('aestheticReference', 'Método de prejuízo estético', 'Se AIPE for pertinente, utilize o protocolo/instrumento específico e fundamente a escolha.'),
        n('aestheticValuation', 'Valoração estética, se cabível', 'Não converter POSAS em AIPE e não somar resultado estético ao déficit funcional.'),
        n('scarQualityReference', 'Qualidade cicatricial — instrumento complementar', 'POSAS, quando aplicável, permanece uma avaliação própria da cicatriz e não uma pontuação de dano estético.')
      ])
    }),
    Object.freeze({
      id: 'repercussions',
      title: '6. Repercussões permanentes e participação',
      fields: Object.freeze([
        n('professionalRepercussionBasis', 'Repercussão profissional — fundamentação', 'Profissão habitual → tarefas essenciais → exigências funcionais → sequela atribuível → interferência concreta → prova → conclusão.'),
        n('leisureRepercussionBasis', 'Atividade física / lazer — fundamentação', 'Compare situação prévia e atual e indique se a diferença é explicada pela sequela atribuível.'),
        n('socialRepercussionBasis', 'Relações sociais / exposição — fundamentação', 'Separe relato, evidência e inferência médico-pericial.'),
        n('sexualRepercussionBasis', 'Repercussão sexual — fundamentação', 'Registrar somente se pertinente ao objeto e sustentada por elementos suficientes.'),
        n('thirdPartyDependenceBasis', 'Dependência de terceira pessoa — fundamentação', 'Descreva quais atividades exigem auxílio, frequência e fundamento, sem tratar este eixo como sinônimo do percentual funcional.')
      ])
    }),
    Object.freeze({
      id: 'integration',
      title: '7. Integração médico-pericial',
      fields: Object.freeze([
        n('personalDamageLimitations', 'Limitações e pontos não demonstrados', 'Registre lacunas, incertezas, hipóteses alternativas e consequências que não podem ser atribuídas com segurança.'),
        n('personalDamageSynthesis', 'Síntese por eixos independentes', 'Integre temporários e permanentes sem somar constructos heterogêneos e sem converter achados médicos em culpa ou valor indenizatório.')
      ])
    })
  ])
});
