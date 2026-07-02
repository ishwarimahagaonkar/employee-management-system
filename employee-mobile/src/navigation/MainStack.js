import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BottomTabNavigator from "../screens/employee/BottomTabNavigator";
import MonthlyAttendance from "../screens/employee/Attendance/MonthlyAttendance";
import LoginScreen from "../screens/auth/LoginScreen";
import EmployeeDashboard from "../screens/employee/Home/EmployeeDashboard";
import TravelScreen from "../screens/employee/Travel/TravelScreen";

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      
    

      <Stack.Screen
        name="BottomTabs"
        component={BottomTabNavigator}
      />
      <Stack.Screen name="MonthlyAttendance" component={MonthlyAttendance} />
      <Stack.Screen name="Home" component={EmployeeDashboard}/>
      {/* <Stack.Screen name="Login" component={LoginScreen}/> */}
      {/* <Stack.Screen name="Travel" component={TravelScreen}/> */}

      
      


    </Stack.Navigator>
  );
}