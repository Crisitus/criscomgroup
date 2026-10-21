export interface DashboardStats {
  totalProducts: number
  totalCategories: number
  totalSales: number
  totalRevenue: number
  recentSales: any[]
  monthlySales?: number[]
  monthlyRevenue?: number[]
  categorySales?: Record<string, number>
  paymentMethods?: Record<string, number>
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // In a real application, you would call an API endpoint
    // const response = await api.get(`/dashboard/stats`);
    // return response.data;

    // For now, we'll return mock data
    return {
      totalProducts: 0,
      totalCategories: 0,
      totalSales: 0,
      totalRevenue: 0,
      recentSales: [],
      monthlySales: [5, 8, 12, 15, 20, 22, 18, 25, 30, 28, 15, 10],
      monthlyRevenue: [500, 800, 1200, 1500, 2000, 2200, 1800, 2500, 3000, 2800, 1500, 1000],
      categorySales: {
        Ropa: 45,
        Accesorios: 30,
        Calzado: 25,
        Joyería: 15,
        Bolsos: 10,
      },
      paymentMethods: {
        Efectivo: 40,
        Tarjeta: 35,
        Transferencia: 15,
        Yape: 10,
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    throw error
  }
}
