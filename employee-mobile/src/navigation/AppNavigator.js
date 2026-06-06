import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import AdminDashboard from "../screens/admin/AdminDashboard";
import BottomTabNavigator from "../screens/employee/BottomTabNavigator";
import AttendanceHistory from "../screens/employee/AttendanceHistory";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        {/* Login */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        {/* Admin */}
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ headerShown: false }}
        />

        {/* Employee */}
        <Stack.Screen
          name="EmployeeDashboard"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Attendance History */}
        <Stack.Screen
          name="AttendanceHistory"
          component={AttendanceHistory}
          options={{ headerShown: false }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}