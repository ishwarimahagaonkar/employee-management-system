import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import AdminDashboard from "../screens/admin/AdminDashboard";
import EmployeeDashboard from "../screens/employee/EmployeeDashboard";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="EmployeeDashboard"
          component={EmployeeDashboard}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}