type ResumenResponse = {
    totalIncome: number
    totalExpenses: number
    balance: number
    paymentMethods: Record<string, number>
    expenseMethods: Record<string, number>
    categories: {
        loanPayments: number
        otherIncome: number
        expenses: Record<string, number>
    }
    previousDayComparison: number
}
