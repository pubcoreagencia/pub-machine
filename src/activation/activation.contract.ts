type ActivationContract = { decisionId: string; actionType: 'send'|'call'|'email'; executed: boolean; executedAt?: Date };
export { ActivationContract };
