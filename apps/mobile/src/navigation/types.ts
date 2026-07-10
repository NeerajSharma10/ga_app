export type DashboardStackParamList = {
  StationDashboard: undefined;
  StartSession: { stationId: number };
};

export type SessionsStackParamList = {
  ActiveSessions: undefined;
};

export type HistoryStackParamList = {
  SessionHistory: undefined;
};

export type CustomersStackParamList = {
  Customers: undefined;
  CustomerDetail: { customerId: number };
};

export type AdminStackParamList = {
  AdminMenu: undefined;
  Reports: undefined;
  ManageStations: undefined;
  ManageStaff: undefined;
};
