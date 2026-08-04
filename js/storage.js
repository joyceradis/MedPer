window.MLKSStorage = {
  key: 'mlks.prototype.v1',
  exportCase(caseData) {
    return {schema:'https://joyceradis.github.io/MLKS/data/mlks.schema.json', exportedAt:new Date().toISOString(), application:'MLKS Unified PWA', case:caseData};
  }
};
