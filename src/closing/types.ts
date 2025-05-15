// Asumiendo que tienes interfaces como estas:
interface ResumenResponse {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  paymentMethods: {
    cash: number;
    transfer: number;
    card: number;
    other: number;
  };
  expenseMethods: Record<string, number>;
  categories: {
    loanPayments: number;
    otherIncome: number;
    expenses: Record<string, number>;
  };
  previousDayComparison: number;
  // Nuevos campos para mostrar todos los registros
  allTodayInstallments: Installment[];
  allTodayExpenses: Expense[];
}

// También necesitarías tener definidas estas interfaces
interface Installment {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  // otros campos relevantes...
}

interface Expense {
  id: string;
  amount: number;
  date: Date;
  category: string;
  paymentMethod: string;
  // otros campos relevantes...
}
