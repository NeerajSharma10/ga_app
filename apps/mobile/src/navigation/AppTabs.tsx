import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import type {
  DashboardStackParamList,
  SessionsStackParamList,
  HistoryStackParamList,
  CustomersStackParamList,
  AdminStackParamList,
} from "./types";
import { StationDashboardScreen } from "../screens/StationDashboardScreen";
import { StartSessionScreen } from "../screens/StartSessionScreen";
import { ActiveSessionsScreen } from "../screens/ActiveSessionsScreen";
import { SessionHistoryScreen } from "../screens/SessionHistoryScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { AdminMenuScreen } from "../screens/AdminMenuScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ManageStationsScreen } from "../screens/ManageStationsScreen";
import { ManageStaffScreen } from "../screens/ManageStaffScreen";
import { useAuthStore } from "../lib/auth-store";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const SessionsStack = createNativeStackNavigator<SessionsStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
};

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={screenOptions}>
      <DashboardStack.Screen name="StationDashboard" component={StationDashboardScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="StartSession" component={StartSessionScreen} options={{ title: "Start session" }} />
    </DashboardStack.Navigator>
  );
}

function SessionsStackScreen() {
  return (
    <SessionsStack.Navigator screenOptions={screenOptions}>
      <SessionsStack.Screen name="ActiveSessions" component={ActiveSessionsScreen} options={{ headerShown: false }} />
    </SessionsStack.Navigator>
  );
}

function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen name="SessionHistory" component={SessionHistoryScreen} options={{ headerShown: false }} />
    </HistoryStack.Navigator>
  );
}

function CustomersStackScreen() {
  return (
    <CustomersStack.Navigator screenOptions={screenOptions}>
      <CustomersStack.Screen name="Customers" component={CustomersScreen} options={{ headerShown: false }} />
      <CustomersStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: "Customer" }} />
    </CustomersStack.Navigator>
  );
}

function AdminStackScreen() {
  return (
    <AdminStack.Navigator screenOptions={screenOptions}>
      <AdminStack.Screen name="AdminMenu" component={AdminMenuScreen} options={{ headerShown: false }} />
      <AdminStack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <AdminStack.Screen name="ManageStations" component={ManageStationsScreen} options={{ title: "Stations & pricing" }} />
      <AdminStack.Screen name="ManageStaff" component={ManageStaffScreen} options={{ title: "Staff" }} />
    </AdminStack.Navigator>
  );
}

function tabIcon(label: string) {
  return { tabBarLabel: label, tabBarIcon: () => <Text>{label[0]}</Text> };
}

export function AppTabs() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackScreen} options={tabIcon("Stations")} />
      <Tab.Screen name="Sessions" component={SessionsStackScreen} options={tabIcon("Active")} />
      <Tab.Screen name="History" component={HistoryStackScreen} options={tabIcon("History")} />
      <Tab.Screen name="Customers" component={CustomersStackScreen} options={tabIcon("Customers")} />
      {isSuperAdmin ? <Tab.Screen name="Admin" component={AdminStackScreen} options={tabIcon("Owner")} /> : null}
    </Tab.Navigator>
  );
}
