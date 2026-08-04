window.MLKSCaseSchema = {
  ensure(caseData) {
    caseData.process ||= { court:'', judge:'', parties:'', appointmentDate:'', deadline:'', fees:'', legalAid:false };
    caseData.scopeDefinition ||= { literalObject: caseData.scope || '', technicalQuestions:'', includes:'', excludes:'', orderText:'' };
    caseData.exam ||= { interview:'', general:'', location:'', dimensions:'', morphology:'', dynamic:'', photos:'', previousState:'', repairability:'', limitations:'' };
    caseData.aipe ||= { eligibility:{damage:false,nexus:false,consolidated:false,permanent:false,visible:false}, q1:{}, category:'', categoryRationale:'', impactLevel:'', initialScore:'', contexts:{}, adjustment:'maintain', adjustmentRationale:'', finalScore:'' };
    caseData.questions ||= [];
    caseData.report ||= { methodology:'', history:'', discussion:'', conclusion:'', references:'', version:1 };
    caseData.validation ||= {};
    return caseData;
  }
};
