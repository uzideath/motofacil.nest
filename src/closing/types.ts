export type ResumenResponse = {
    totalIncome: number
    totalExpenses: number
    balance: number
    paymentMethods: {
        cash: number
        transfer: number
        card: number
        other: number
    }
    categories: {
        loanPayments: number
        otherIncome: number
    }
    previousDayComparison: number
}
