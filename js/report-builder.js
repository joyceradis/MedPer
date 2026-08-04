window.MLKSReportBuilder = {
  build(caseData) {
    const a=caseData.aipe||{};
    const cat=window.MLKSAIPE.categories.find(c=>c.id===a.category);
    const qs=(caseData.questions||[]).map((q,i)=>`${i+1}. ${q.text}\nResposta: ${q.answer||'não elaborada'}`).join('\n\n');
    return `LAUDO MÉDICO-PERICIAL\n\n1. IDENTIFICAÇÃO E OBJETO\nCaso: ${caseData.title}\nReferência: ${caseData.reference||'não informada'}\nObjeto literal: ${caseData.scopeDefinition?.literalObject||caseData.scope||'não delimitado'}\n\n2. METODOLOGIA\n${caseData.report?.methodology||'não elaborada'}\n\n3. DOCUMENTOS ANALISADOS\n${(caseData.evidence||[]).map(e=>`- ${e.title}`).join('\n')||'nenhum documento registrado'}\n\n4. HISTÓRICO E CRONOLOGIA\n${caseData.report?.history||'não elaborado'}\n\n5. EXAME PERICIAL\n${caseData.exam?.general||'não elaborado'}\n${caseData.exam?.morphology||''}\n\n6. DISCUSSÃO MÉDICO-LEGAL\n${caseData.report?.discussion||caseData.reasoning?.notes||'não elaborada'}\n\n7. DANO ESTÉTICO\nCategoria AIPE: ${cat?`${cat.label} (${cat.range.join('–')})`:'não definida'}\nPontuação final: ${a.finalScore||'não definida'}\nFundamentação: ${a.categoryRationale||'não registrada'}\n\n8. RESPOSTAS AOS QUESITOS\n${qs||'nenhum quesito registrado'}\n\n9. CONCLUSÃO\n${caseData.report?.conclusion||'não elaborada'}\n\n10. REFERÊNCIAS\n${caseData.report?.references||'não registradas'}`;
  }
};
