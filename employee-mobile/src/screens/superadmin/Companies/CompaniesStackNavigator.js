import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CompaniesScreen from "./CompaniesScreen";
import CompanyDetailScreen from "./CompanyDetailScreen";

const Stack = createNativeStackNavigator();

export default function CompaniesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompaniesList" component={CompaniesScreen} />
      <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} />
    </Stack.Navigator>
  );
}
